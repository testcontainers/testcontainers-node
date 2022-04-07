name: Bug Report
description: File a bug report
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting an issue. Please review the task list below before submitting the issue. Your issue report will be closed if the issue is incomplete and the below tasks not completed.

        NOTE: If you are unsure about something and the issue is more of a question a better place to ask questions is on Github Discussions.
  - type: textarea
    attributes:
      label: Expected Behavior
      description: A concise description of what you expected to happen.
      placeholder: Tell us what should happen
    validations:
      required: false
  - type: textarea
    attributes:
      label: Actual Behaviour
      description: A concise description of what you're experiencing.
      placeholder: Tell us what happens instead
    validations:
      required: false
  - type: textarea
    attributes:
      label: Log output
      description: The logs created by testcontainers when the issue occurs (set environment variable `DEBUG` to `testcontainers*`.
      placeholder: Logs...
    validations:
      required: false
- type: textarea
    attributes:
      label: Steps To Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. In this environment...
        2. With this config...
        3. Run '...'
        4. See error...
    validations:
      required: false
  - type: textarea
    attributes:
      label: Environment Information
      description: Environment information where the problem occurs.
      placeholder: |
        - Operating System:
        - Docker Version:
        - Node version:
        - Testcontainers version:
    validations:
      required: false
