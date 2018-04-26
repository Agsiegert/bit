// @flow
import type { CheckoutProps } from '../../../consumer/versions-ops/checkout-version';
import type { ApplyVersionResults } from '../../../consumer/versions-ops/merge-version';
import { loadConsumer, Consumer } from '../../../consumer';
import checkoutVersion from '../../../consumer/versions-ops/checkout-version';

export default (async function checkout(useProps: CheckoutProps): Promise<ApplyVersionResults> {
  const consumer: Consumer = await loadConsumer();
  return checkoutVersion(consumer, useProps);
});
