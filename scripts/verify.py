#!/usr/bin/env python3
"""
Cross-check: extract the FULL role grid (all columns, main + sub) per day,
plus the DUTY AGT list, so we can compare against the raw PDF text.
Usage: python3 verify.py <pdf> [INITIALS]
"""
import re, sys, subprocess, html

ROLE_COLS = ["MOD", "O", "T", "C1", "C2", "R1", "R2", "I/B1", "I/B2", "FL"]

def words(pdf):
    xml = subprocess.run(["pdftotext", "-bbox-layout", pdf, "-"],
                         capture_output=True, text=True).stdout
    out = []
    for m in re.finditer(
        r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>',
        xml):
        x0, y0, x1, y1, t = m.groups()
        out.append({"t": html.unescape(t).strip(),
                    "xc": (float(x0)+float(x1))/2, "yc": (float(y0)+float(y1))/2})
    return out

def main():
    pdf = sys.argv[1]
    who = sys.argv[2] if len(sys.argv) > 2 else None
    ws = words(pdf)

    hdr_y = next(w["yc"] for w in ws if w["t"] == "C1")
    hdr = [w for w in ws if abs(w["yc"] - hdr_y) < 2.5]
    col_x = {}
    for name in ROLE_COLS:
        cand = [w for w in hdr if w["t"] == name]
        if cand: col_x[name] = cand[0]["xc"]
    c1x, spacing = col_x["C1"], col_x["C2"] - col_x["C1"]
    for i, name in enumerate(ROLE_COLS):
        col_x.setdefault(name, c1x + (i - ROLE_COLS.index("C1")) * spacing)
    role_min = min(col_x.values()) - spacing / 2
    half = spacing / 2
    print("column centers:", {k: round(v,1) for k,v in col_x.items()})
    print("role region starts at x >=", round(role_min,1), "\n")

    datex = next(w["xc"] for w in ws if w["t"] == "Date")
    dates = sorted([w for w in ws if re.fullmatch(r"\d{1,2}", w["t"])
                    and abs(w["xc"] - datex) < 6], key=lambda w: w["yc"])
    day_x = next(w["xc"] for w in ws if w["t"] == "Day")
    WD = {"Mon","Tue","Wed","Thu","Fri","Sat","Sun"}
    def nearest_date(yc): return min(dates, key=lambda d: abs(d["yc"]-yc))["yc"]
    top = dates[0]["yc"] - 6           # drop title/header rows above first date
    ws = [w for w in ws if w["yc"] > top]

    print(f"{'Dt':<5}{'Day':<5}" + "".join(f"{c:<9}" for c in ROLE_COLS) + " | DUTY AGT")
    print("-"*135)
    for d in dates:
        num = int(d["t"]); band = [w for w in ws if nearest_date(w["yc"]) == d["yc"]]
        day = next((w["t"] for w in sorted(band, key=lambda w: abs(w["yc"]-d["yc"]))
                    if abs(w["xc"]-day_x) < 8 and w["t"] in WD), "?")
        # bucket role tokens by nearest column
        cells = {c: {"main": [], "sub": []} for c in ROLE_COLS}
        duty = []
        for w in band:
            if w["t"] in WD or w["t"] == str(num): continue
            if w["xc"] < role_min:
                if 38 < w["xc"] < role_min and w["t"]: duty.append((w["xc"], w["t"]))
                continue
            col = min(ROLE_COLS, key=lambda c: abs(col_x[c]-w["xc"]))
            if abs(col_x[col]-w["xc"]) <= half + 1:
                (cells[col]["sub"] if w["t"].startswith("(") else cells[col]["main"]).append(w["t"])
        def fmt(c):
            m = "/".join(cells[c]["main"]) or "·"
            s = "".join(cells[c]["sub"])
            return m + s
        dutylist = " ".join(t for _, t in sorted(duty))
        mark = ""
        if who:
            inrole = [c for c in ROLE_COLS if who in [x.strip("()") for x in cells[c]["main"]+cells[c]["sub"]]]
            mark = f"  <== {who}: {inrole}" if inrole else "  <== (JP off?)"
        print(f"{num:<5}{day:<5}" + "".join(f"{fmt(c):<9}" for c in ROLE_COLS) + f" | {dutylist}{mark}")

if __name__ == "__main__":
    main()
