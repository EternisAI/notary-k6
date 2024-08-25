import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';

export const options = {
    scenarios: {
        ui: {
            executor: 'per-vu-iterations',
            options: {
                browser: {
                    type: 'chromium',
                },
            },
            vus: 3,
            iterations: 10,
        },
    },
    thresholds: {
        checks: ['rate==1.0'],
    },
};

const myTrend = new Trend('total_action_time', true);

export default async function () {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:8080');
        await page.evaluate(() => window.performance.mark('page-visit'));
        await Promise.all([page.waitForLoadState("networkidle"), page.locator('#start-demo').click()]);
        await page.evaluate(() => window.performance.mark('action-completed'));
        await page.evaluate(() =>
            window.performance.measure('total-action-time', 'page-visit', 'action-completed')
        );

        const totalActionTime = await page.evaluate(
            () =>
                JSON.parse(JSON.stringify(window.performance.getEntriesByName('total-action-time')))[0]
                    .duration
        );

        myTrend.add(totalActionTime);

        await page.locator("#proof").click();
        await page.locator("#verification").click();
        await page.screenshot({ path: `scsht/${exec.vu.iterationInInstance}.png` });
    } finally {
        await page.close();
    }
}