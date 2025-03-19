#!/usr/bin/env bash

# exit on error, unset variables, print commands, fail on pipe errors
set -euxo pipefail

# How to test this script, run it with the required environment variables:
# 1. A modified file from the root, but not the package.json or package-lock.json:
#   ALL_CHANGED_FILES="README.md" ./.github/scripts/changed-modules.sh
#   Expected output: [], as no module should be built
#
# 2. The package.json or package-lock.json are modified:
#   ALL_CHANGED_FILES="package.json" ./.github/scripts/changed-modules.sh
#   Expected output: all modules, as the dependencies have been modified
#   ALL_CHANGED_FILES="package-lock.json" ./.github/scripts/changed-modules.sh
#   Expected output: all modules, as the dependencies have been modified
#
# 3. A file in the testcontainers module is modified:
#   ALL_CHANGED_FILES="packages/testcontainers/a.txt" ./.github/scripts/changed-modules.sh
#   Expected output: all modules, as the core has been modified
#
# 4. A file in a module is modified:
#   ALL_CHANGED_FILES="packages/modules/arangodb/a.txt" ./.github/scripts/changed-modules.sh
#   Expected output: [arangodb], only
#
# 5. Three files in three different modules are modified:
#   ALL_CHANGED_FILES="packages/modules/arangodb/a.txt packages/modules/cassandra/b.txt packages/modules/chromadb/c.txt" ./.github/scripts/changed-modules.sh
#   Expected output: [arangodb, cassandra, chromadb]
#
# 6. Core files and module files are modified:
#   ALL_CHANGED_FILES="packages/testcontainers/a.txt packages/modules/chromadb/b.txt" ./.github/scripts/changed-modules.sh
#   Expected output: all modules, as the core has been modified
#
# 7. This script is modified:
#   ALL_CHANGED_FILES=".github/scripts/changed-modules.sh" ./.github/scripts/changed-modules.sh
#   Expected output: all modules, as the build script has been modified
#
# 8. A .github file is modified:
#   ALL_CHANGED_FILES=".github/release-drafter.yml" ./.github/scripts/changed-modules.sh
#   Expected output: []
#
# 9. A excluded module is modified:
#   ALL_CHANGED_FILES="packages/modules/couchbase/a.txt" ./.github/scripts/changed-modules.sh
#   Expected output: []
#
# There is room for improvement in this script. For example, it could detect if the changes applied to the docs or the .github dirs, and then do not include any module in the list.
# But then we would need to verify the CI scripts to ensure that the job receives the correct modules to build.

# ROOT_DIR is the root directory of the repository.
readonly ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

# define an array of directories that won't be included in the list
readonly excluded_modules=(".devcontainer" ".vscode" ".husky" "docs" ".github/ISSUE_TEMPLATE")

# define an array of files that won't be included in the list
# Get all files in the root directory except package.json and package-lock.json
# Create array of excluded files by finding all files in root dir except package.json and package-lock.json
excluded_files=("${ROOT_DIR}/.github/release-drafter.yml")
while IFS= read -r file; do
  excluded_files+=("\"${file}\"")
done < <(find "${ROOT_DIR}" -maxdepth 1 -type f -not -name "package.json" -not -name "package-lock.json")

# define an array of modules that won't be part of the build
readonly no_build_modules=("couchbase")

# modules is an array that will store the paths of all the modules in the repository.
modules=()

# Find all package.json files in the repository, building a list of all the available modules.
# The list of modules is stored in the modules array, but the testcontainers-node module is excluded
# as it is not a module.
for packageJSONFile in $(find "${ROOT_DIR}" -name "package.json" -not -path "*/node_modules/*"); do
    name=$(basename "$(dirname "${packageJSONFile}")")
    if [[ "${name}" != "testcontainers-node" ]]; then
        modules+=("\"${name}\"")
    fi
done

# sort modules array
IFS=$'\n' modules=($(sort <<<"${modules[*]}"))
unset IFS

# Get the list of modified files, retrieved from the environment variable ALL_CHANGED_FILES.
# On CI, this value will come from a Github Action retrieving the list of modified files from the pull request.
readonly modified_files=${ALL_CHANGED_FILES[@]}

# Initialize variables
modified_modules=()

# Check the modified files and determine which modules to build, following these rules:
# - if the modified files contain any file in the root module, include all modules in the list
# - if the modified files only contain files in one of the modules, include that module in the list
for file in $modified_files; do
    # check if the file is in one of the excluded files
    for exclude_file in ${excluded_files[@]}; do
        # Remove quotes from exclude_file for comparison
        clean_exclude_file=$(echo $exclude_file | tr -d '"')
        if [[ "${ROOT_DIR}/${file}" == "${clean_exclude_file}" ]]; then
            # if the file is in the excluded files, skip the rest of the loop.
            # Execution continues at the loop control of the 2nd enclosing loop.
            continue 2
        fi
    done

    if [[ $file == packages/modules/* ]]; then
        module_name=$(echo $file | cut -d'/' -f3)
        if [[ ! " ${modified_modules[@]} " =~ " ${module_name} " ]]; then
            modified_modules+=("\"$module_name\"")
        fi
    else
        # a file from the core module (packages/testcontainers) is modified, so include all modules in the list and stop the loop
        # check if the file is in one of the excluded modules
        for exclude_module in ${excluded_modules[@]}; do
            if [[ $file == $exclude_module/* ]]; then
                # continue skips to the next iteration of an enclosing for, select, until, or while loop in a shell script.
                # Execution continues at the loop control of the nth enclosing loop, in this case two levels up.
                continue 2
            fi
        done

        modified_modules=${modules[@]}
        break
    fi
done

# print all modules with this format:
# each module will be enclosed in double quotes
# each module will be separated by a comma
# the entire list will be enclosed in square brackets
# the list will be sorted and unique
sorted_unique_modules=($(echo "${modified_modules[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

# remove modules that won't be part of the build from the list
filtered_modules=()
for module in "${sorted_unique_modules[@]}"; do
    skip=false
    for no_build_module in "${no_build_modules[@]}"; do
        if [[ ${module} == \"${no_build_module}\" ]]; then
            skip=true
            break
        fi
    done
    if [[ $skip == false ]]; then
        filtered_modules+=(${module})
    fi
done
sorted_unique_modules=("${filtered_modules[@]}")

echo "["$(IFS=,; echo "${sorted_unique_modules[*]}" | sed 's/ /,/g')"]"
