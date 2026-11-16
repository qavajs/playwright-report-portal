import { DataTable, Given, When, Then } from '@qavajs/playwright-runner-adapter';
import { NoBrowserWorld } from './world';

Given('I have {int} {string} in the cart', async function (this: NoBrowserWorld, count: number, item: string) {
    this.cart = { count, item };
    await this.log(`cart: ${count} x ${item}`);
});

Given('I have the following items in the cart:', async function (this: NoBrowserWorld, table: DataTable) {
    const rows = table.hashes();
    this.cart = {
        count: rows.reduce((sum, row) => sum + Number(row.count), 0),
        item: rows.map(row => row.item).join(', ')
    };
});

When('I add the following note to the order:', async function (this: NoBrowserWorld, note: string) {
    await this.log(`order note: ${note}`);
});

When('I check out', async function (this: NoBrowserWorld) {
    if (this.cart.count === 0) {
        throw new Error(`Cannot check out an empty cart (0 "${this.cart.item}")`);
    }
    this.confirmed = true;
});

When('I attach debug info', async function (this: NoBrowserWorld) {
    await this.attach(JSON.stringify(this.cart), 'application/json');
    this.confirmed = true;
});

// 1x1 transparent PNG, base64-encoded
const SCREENSHOT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

When('I attach a screenshot', async function (this: NoBrowserWorld) {
    await this.attach(SCREENSHOT_PNG_BASE64, 'image/png;base64');
});

Then('the order is confirmed', async function (this: NoBrowserWorld) {
    if (!this.confirmed) {
        throw new Error('order was not confirmed');
    }
});
