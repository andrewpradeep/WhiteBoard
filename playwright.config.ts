import { defineConfig, devices } from "@playwright/test";

const PORT = 41873;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: "./tests",
    timeout: 120_000,
    expect: {
        timeout: 10_000,
    },
    reporter: "list",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: BASE_URL,
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
        viewport: {
            width: 1440,
            height: 900,
        },
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
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
