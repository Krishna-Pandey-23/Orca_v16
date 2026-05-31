#!/usr/bin/env python3
import yfinance as yf, json, sys, time
from datetime import datetime, timezone

SYMBOLS = [
    "^GSPC","^DJI","^IXIC","^NYA","^XAX","^BUK100P","^RUT","^VIX",
    "^FTSE","^GDAXI","^FCHI","^STOXX50E","^N100","^BFX","MOEX.ME",
    "^HSI","^STI","^AXJO","^AORD","^BSESN","^JKSE","^KLSE","^NZ50",
    "^KS11","^TWII","^GSPTSE","^BVSP","^MXX","^IPSA","^MERV",
    "^TA125.TA","^CASE30","^JN0U.JO","DX-Y.NYB","^125904-USD-STRD",
    "^XDB","^XDE","000001.SS","^N225","^XDN","^XDA"
]

NAMES = {
    "^GSPC":"S&P 500","^DJI":"Dow Jones Industrial Average","^IXIC":"NASDAQ Composite",
    "^NYA":"NYSE Composite","^XAX":"NYSE American Composite","^BUK100P":"Cboe UK 100",
    "^RUT":"Russell 2000","^VIX":"CBOE Volatility Index","^FTSE":"FTSE 100",
    "^GDAXI":"DAX","^FCHI":"CAC 40","^STOXX50E":"ESTX 50 PR.EUR","^N100":"Euronext 100",
    "^BFX":"BEL 20","MOEX.ME":"MOEX Russia Index","^HSI":"Hang Seng Index",
    "^STI":"STI Index","^AXJO":"S&P/ASX 200","^AORD":"All Ordinaries",
    "^BSESN":"S&P BSE SENSEX","^JKSE":"IDX Composite","^KLSE":"FTSE Bursa Malaysia KLCI",
    "^NZ50":"S&P/NZX 50","^KS11":"KOSPI Composite","^TWII":"TSEC Weighted Index",
    "^GSPTSE":"S&P/TSX Composite","^BVSP":"IBOVESPA","^MXX":"IPC MEXICO",
    "^IPSA":"S&P/CLX IPSA","^MERV":"MERVAL","^TA125.TA":"TA-125",
    "^CASE30":"EGX 30 Price Return Index","^JN0U.JO":"FTSE/JSE Top 40 USD Net TRI",
    "DX-Y.NYB":"US Dollar Index","^125904-USD-STRD":"Vanguard Total World",
    "^XDB":"British Pound Currency Index","^XDE":"Euro Currency Index",
    "000001.SS":"SSE Composite Index","^N225":"Nikkei 225",
    "^XDN":"Japanese Yen Currency Index","^XDA":"Australian Dollar Currency Index"
}

# ALL logs go to stderr — stdout is reserved for the JSON payload
def log(msg: str):
    print(f"[yfinance] {msg}", file=sys.stderr, flush=True)

def fmt_vol(v):
    if v is None: return None
    try:
        v = float(v)
        if v >= 1e9: return f"{v/1e9:.2f}B"
        if v >= 1e6: return f"{v/1e6:.2f}M"
        if v >= 1e3: return f"{v/1e3:.1f}K"
        return str(int(v))
    except: return None

def safe(v):
    try:
        f = float(v)
        return None if f != f else f
    except: return None

def main():
    t0 = time.time()
    log(f"Starting fetch for {len(SYMBOLS)} symbols")

    log("Initialising yf.Tickers...")
    tickers = yf.Tickers(" ".join(SYMBOLS))
    log(f"Tickers object ready ({time.time()-t0:.1f}s)")

    out = []
    ok_count = 0
    null_count = 0

    for sym in SYMBOLS:
        entry = {
            "symbol": sym, "name": NAMES.get(sym, sym),
            "price": None, "change": None, "changePercent": None,
            "volume": None, "dayRangeLow": None, "dayRangeHigh": None,
            "fiftyTwoWeekLow": None, "fiftyTwoWeekHigh": None,
            "currency": None, "exchangeName": None,
            "marketState": None, "region": None
        }
        t = tickers.tickers.get(sym)
        if t is not None:
            try:
                fi = t.fast_info
                price = safe(fi.last_price)
                prev  = safe(fi.previous_close)
                entry.update({
                    "price":            price,
                    "change":           round(price - prev, 4)          if price and prev else None,
                    "changePercent":    round((price-prev)/prev*100, 4) if price and prev else None,
                    "volume":           fmt_vol(getattr(fi, "last_volume",  None)),
                    "dayRangeLow":      safe(getattr(fi, "day_low",         None)),
                    "dayRangeHigh":     safe(getattr(fi, "day_high",        None)),
                    "fiftyTwoWeekLow":  safe(getattr(fi, "year_low",        None)),
                    "fiftyTwoWeekHigh": safe(getattr(fi, "year_high",       None)),
                    "currency":     getattr(fi, "currency", None),
                    "exchangeName": getattr(fi, "exchange",  None),
                })
                if price is not None:
                    chg_str = f"{entry['change']:+.2f} ({entry['changePercent']:+.2f}%)" if entry['change'] else "n/a"
                    log(f"  ✓  {sym:<22} price={price:<12.4f} chg={chg_str}")
                    ok_count += 1
                else:
                    log(f"  ⚠  {sym:<22} ticker found but price=None")
                    null_count += 1
            except Exception as e:
                log(f"  ✗  {sym:<22} fast_info error: {e}")
                null_count += 1
        else:
            log(f"  ✗  {sym:<22} ticker not found in yf.Tickers result")
            null_count += 1
        out.append(entry)

    elapsed = time.time() - t0
    log(f"Done: {ok_count}/{len(SYMBOLS)} symbols with price data, {null_count} empty — {elapsed:.2f}s")

    # stdout: JSON only, nothing else
    print(json.dumps({
        "success":    True,
        "indices":    out,
        "fetchedAt":  datetime.now(timezone.utc).isoformat(),
        "source":     "yfinance",
        "totalCount": len(out)
    }))

if __name__ == "__main__":
    try: main()
    except Exception as e:
        log(f"FATAL: {e}")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)