module.exports = {
  preset: "jest-expo",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  collectCoverageFrom: [
    "src/utils/**/*.{ts,tsx}",
    "src/services/domain/**/*.{ts,tsx}",
    "src/services/database/repositories/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageThreshold: {
    global: { statements: 90, lines: 90, functions: 95 },
  },
};
