import type {Discovery} from './types';
import {Icon} from './Icon';
import {ContactSource, businessCopy} from './ContactSource';
import {CHARGE_RULE, priceSummary} from './taskPresentation';

export function ContactPicker({data,selected,onSelect,onStart,busy}: {
  data: Discovery; selected: string[]; onSelect:(ids:string[])=>void; onStart:()=>void; busy:boolean;
}) {
  const price = data.answerPriceCents != null ? priceSummary({priceCents:data.answerPriceCents,selected:selected.length,availableCents:data.availableCents??undefined}) : undefined;
  const blocked = data.callingAvailable === false || !price;
  const short = !!price?.short;
  return <section className="card shop-card" aria-label="Businesses to call">
    <div className="product-head"><div><h2>{data.shops.length} businesses to call</h2><p>{data.product.name}</p><p>Check the names and numbers. Pick the businesses we should call.</p></div></div>
    <div className="pick-list">{data.shops.map(shop => <div className="contact-choice" key={shop.placeId}>
      <button className="pick-row" type="button" aria-pressed={selected.includes(shop.placeId)} disabled={busy} onClick={()=>onSelect(selected.includes(shop.placeId)?selected.filter(id=>id!==shop.placeId):[...selected,shop.placeId])}>
        <span className="tick" aria-hidden="true">{selected.includes(shop.placeId)&&<Icon name="check"/>}</span>
        <span className="pick-text"><span className="shop-name">{shop.name}</span><span className="pick-meta">{shop.phone}</span>{shop.address&&<span className="pick-meta">{shop.address}</span>}</span>
      </button>
      <ContactSource shop={shop} row/>
    </div>)}</div>
    <div className="card-footer">
      {blocked&&<p className="blocked">{data.callingUnavailableMessage || 'Calling is unavailable right now. No calls have started.'}</p>}
      {price&&<div className="price-block" aria-live="polite">
        <p>{selected.length?<><strong>{price.maxText}</strong> for {selected.length} {selected.length===1?'business':'businesses'} · </>:null}{businessCopy(price.perText,true)}</p>
        {price.balanceText&&<p className={short?'blocked':undefined}>{price.balanceText}{short?`, enough for ${price.affordable} ${price.affordable===1?'business':'businesses'}. Pick fewer businesses.`:''}</p>}
        <p className="price-rule">{businessCopy(CHARGE_RULE,true)}</p>
      </div>}
      <button className="primary" disabled={blocked||short||busy||!selected.length} onClick={onStart}>{busy?'Starting calls…':selected.length?`Call ${selected.length} ${selected.length===1?'business':'businesses'}`:'Pick businesses to call'}</button>
      <p>Contact details do not confirm what a business can offer.</p>
    </div>
  </section>;
}
