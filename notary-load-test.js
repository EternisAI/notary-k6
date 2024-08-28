import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';
import { fail, check } from 'k6';

export const options = {
    scenarios: {
        ui: {
            executor: 'per-vu-iterations',
            options: {
                browser: {
                    type: 'chromium',
                },
            },
            vus: 5,
            iterations: 5,
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
        await page.waitForLoadState("load");
        await page.evaluate(() => window.performance.mark('page-visit'));
        await page.locator('#start-demo').click();
        await page.waitForTimeout(3000);
        const proof = await page.waitForFunction("document.querySelector('#proof')", {polling: "mutation"});
        const proofInnerHtml = await proof.innerText();
        check(proof, { 'proof successfully resolved': proofInnerHtml !== '' });
        
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

        await page.screenshot({ path: `scsht/${exec.vu.iterationInInstance}.png` });
    } catch (err) {
        fail(err);
    } finally {
        await page.close();
        await context.close();
    }
}