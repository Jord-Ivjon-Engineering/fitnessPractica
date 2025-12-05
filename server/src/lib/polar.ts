import { Polar } from "@polar-sh/sdk";

if (!process.env.POLAR_ACCESS_TOKEN) {
  throw new Error("POLAR_ACCESS_TOKEN environment variable is required");
}

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: 'sandbox', // Configure for sandbox environment
});

