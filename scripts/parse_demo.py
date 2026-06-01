#!/usr/bin/env python3
"""
Deterministic demo parser — NO AI.
Reads the text-based PDF's word coordinates (via pdftotext -bbox-layout)
and extracts one person's monthly schedule by column geometry.
Usage: python3 parse_demo.py <pdf> <INITIALS>
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
        out.append({
            "t": html.unescape(t).strip(),
            "xc": (float(x0) + float(x1)) / 2,
            "yc": (float(y0) + float(y1)) / 2,
        })
    return out

def main():
    pdf, who = sys.argv[1], sys.argv[2]
    ws = words(pdf)

    # --- header row (y of "MOD"/role labels) ---
    hdr_y = next(w["yc"] for w in ws if w["t"] == "C1")
    hdr = [w for w in ws if abs(w["yc"] - hdr_y) < 2.5]
    col_x = {}
    for name in ROLE_COLS:
        cand = [w for w in hdr if w["t"] == name]
        if cand:
            col_x[name] = cand[0]["xc"]
    # O and T are single letters; disambiguate by position relative to C1
    c1x = col_x["C1"]
    spacing = col_x["C2"] - col_x["C1"]            # ~19.6
    for i, name in enumerate(ROLE_COLS):
        if name not in col_x:                      # infer any missing by spacing
            col_x[name] = c1x + (i - ROLE_COLS.index("C1")) * spacing
    role_min = min(col_x.values()) - spacing / 2
    half = spacing / 2

    # --- date rows ---
    datex = next(w["xc"] for w in ws if w["t"] == "Date")
    dates = sorted(([w for w in ws if re.fullmatch(r"\d{1,2}", w["t"])
                     and abs(w["xc"] - datex) < 6]),
                   key=lambda w: w["yc"])
    day_x = next(w["xc"] for w in ws if w["t"] == "Day")

    def nearest_date_yc(yc):
        return min(dates, key=lambda d: abs(d["yc"] - yc))["yc"]

    results = []
    for d in dates:
        num = int(d["t"])
        band = [w for w in ws if nearest_date_yc(w["yc"]) == d["yc"]]
        WD = {"Mon","Tue","Wed","Thu","Fri","Sat","Sun"}
        day = next((w["t"] for w in sorted(band, key=lambda w: abs(w["yc"] - d["yc"]))
                    if abs(w["xc"] - day_x) < 8 and w["t"] in WD), "")
        # find this person's token in the role region (xc >= role_min)
        hit = None
        for w in band:
            if w["xc"] < role_min:
                continue
            core = w["t"].strip("()")
            if core == who:
                col = min(ROLE_COLS, key=lambda c: abs(col_x[c] - w["xc"]))
                if abs(col_x[col] - w["xc"]) <= half + 1:
                    hit = (col, w["t"].startswith("("))
                    break
        # also: present anywhere in the day at all?
        present_anywhere = any(x["t"].strip("()") == who for x in band)
        results.append((num, day, hit, present_anywhere))

    label = {"MOD":"MOD","O":"O","T":"T","C1":"Counter1","C2":"Counter2",
             "R1":"Ramp1","R2":"Ramp2","I/B1":"I/B1","I/B2":"I/B2","FL":"FL"}
    print(f"\n=== {who} — June 2026 (deterministic, no AI) ===\n")
    work = off = 0
    for num, day, hit, present in results:
        if hit:
            col, sub = hit
            tag = f"{label[col]}" + ("  (서브 어시스턴트)" if sub else "")
            print(f"  6/{num:<2} {day:<3}  근무 → {tag}")
            work += 1
        elif present:
            print(f"  6/{num:<2} {day:<3}  근무 (역할 미지정/대기)")
            work += 1
        else:
            print(f"  6/{num:<2} {day:<3}  휴무")
            off += 1
    print(f"\n  근무 {work}일 · 휴무 {off}일")

if __name__ == "__main__":
    main()
