import type {Shop} from './types';

export function ShopPhone({shop}: {shop: Shop}) {
  return <div className="shop-phone">
    {shop.phone
      ? <a href={`tel:${shop.phone}`} aria-label={`Call ${shop.name} at ${shop.phone}`}>{shop.phone}</a>
      : <span>Phone number unavailable</span>}
  </div>;
}
