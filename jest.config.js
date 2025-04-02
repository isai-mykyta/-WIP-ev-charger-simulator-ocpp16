module.exports = {
  preset: "ts-jest",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: [
    "**/*.(t|j)s"
  ],
  coverageDirectory: "../coverage",
  testTimeout: 30000,
  maxWorkers: 1,
  testEnvironment: "node",
  coveragePathIgnorePatterns: []
};