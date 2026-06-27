import { defineConfig, devices } from "@playwright/test";

const PORT = 41873;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    reporter: "list",
    use: {
        baseURL: BASE_URL,
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            grepInvert: /@mobile/,
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1440, height: 900 },
            },
        },
        {
            name: "mobile",
            grep: /@mobile/,
            use: {
                ...devices["Pixel 5"],
                viewport: { width: 390, height: 844 },
            },
        },
    ],
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
        reuseExistingServer: false,
        timeout: 120_000,
        url: BASE_URL,
    },
});
