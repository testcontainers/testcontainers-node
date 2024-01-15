import { StartedSupertokensContainer, SupertokensContainer } from "./supertokens-container";

describe("SupertokensContainer", () => {
  jest.setTimeout(180_000);
  let container: StartedSupertokensContainer;
  let baseUrl: string;

  beforeAll(async () => {
    container = await new SupertokensContainer().start();
    baseUrl = container.getConnectionUri();
  });

  afterAll(async () => {
    await container.stop();
  });

  const signUpUser = async (email: string, password: string) => {
    const response = await fetch(`${baseUrl}/recipe/signup`, {
      method: "POST",
      headers: {
        rid: "emailpassword",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  };

  const signInUser = async (email: string, password: string) => {
    const response = await fetch(`${baseUrl}/recipe/signin`, {
      method: "POST",
      headers: {
        rid: "emailpassword",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  };

  const verifyEmail = async (userId: string, email: string) => {
    const emailTokenResponse = await fetch(`${baseUrl}/recipe/user/email/verify/token`, {
      method: "POST",
      headers: {
        rid: "emailverification",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, email }),
    });
    const token = (await emailTokenResponse.json()).token;
    const res = await fetch(`${baseUrl}/recipe/user/email/verify`, {
      method: "POST",
      headers: {
        rid: "emailverification",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method: "token", token }),
    });
    return await res.json();
  };

  it("should register a new user", async () => {
    const email = "newuser@example.com";
    const password = "password123";
    const signUpResponse = await signUpUser(email, password);

    expect(signUpResponse.status).toBe("OK");
    expect(signUpResponse.user.emails[0]).toBe(email);
  });

  it("should sign in an existing user", async () => {
    const email = "existinguser@example.com";
    const password = "password123";
    await signUpUser(email, password);
    const signInResponse = await signInUser(email, password);

    expect(signInResponse.status).toBe("OK");
    expect(signInResponse.user.emails[0]).toBe(email);
  });

  it("should verify a user's email", async () => {
    const email = "verifyemail@example.com";
    const password = "password123";
    const signUpResponse = await signUpUser(email, password);
    const verifyResponse = await verifyEmail(signUpResponse.user.id, email);

    expect(verifyResponse.status).toBe("OK");
  });

  it("should not register a user with an existing email", async () => {
    const email = "duplicate@example.com";
    const password = "password123";
    await signUpUser(email, password);
    const secondSignUpResponse = await signUpUser(email, password);

    expect(secondSignUpResponse.status).toBe("EMAIL_ALREADY_EXISTS_ERROR");
  });
});
