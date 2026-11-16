import { Given, When, Then } from '@qavajs/playwright-runner-adapter';
import { NoBrowserWorld } from './world';

Given('I have {int} {string} in the wishlist', async function (this: NoBrowserWorld, count: number, item: string) {
    this.wishlist = { count, item };
});

When('I move it to the cart', async function (this: NoBrowserWorld) {
    if (this.wishlist.count === 0) {
        throw new Error(`Cannot move an empty wishlist item (0 "${this.wishlist.item}")`);
    }
    this.wishlist.count = 0;
});

Then('the wishlist is empty', async function (this: NoBrowserWorld) {
    if (this.wishlist.count !== 0) {
        throw new Error(`Wishlist still has ${this.wishlist.count} "${this.wishlist.item}"`);
    }
});
