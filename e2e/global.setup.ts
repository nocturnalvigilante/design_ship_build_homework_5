import { createClerkClient } from "@clerk/nextjs/server";
import { clerkSetup } from "@clerk/testing/playwright";
import { USER_A, USER_B } from "./users";

// Runs once before the tests: gets a Clerk testing token (so the tests can get
// past Clerk's bot protection) and makes sure both test users exist.
export default async function globalSetup() {
  await clerkSetup();

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  for (const email of [USER_A, USER_B]) {
    const { data } = await clerk.users.getUserList({ emailAddress: [email] });
    if (data.length === 0) {
      await clerk.users.createUser({ emailAddress: [email], skipPasswordRequirement: true });
    }
  }
}
