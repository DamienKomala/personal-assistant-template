#!/usr/bin/env python3
"""Scan public Greenhouse / Ashby / Lever job-board APIs for senior design roles.

These APIs return only LIVE postings, with publish date and (Ashby) pay, so a hit here
is already verified. Read-only: no sign-in, no applying.
Usage: python3 Tools/ats-scan.py > hits.txt   (extend the slug lists freely)
       python3 Tools/ats-scan.py --kw 'regex' [--sen 'regex'] [--no-skip]   (non-design titles)
"""
import json, urllib.request, re, sys, concurrent.futures as cf
GH="remotecom shopltk dropbox warp mercury welcome roo luxurypresence anthropic figma airtable gusto brex robinhood chime sofi affirm plaid carta gitlab datadog elastic twilio samsara grammarly canva duolingo discord pinterest lyft doordash faire asana zapier calendly cloudflare okta nerdwallet betterment wealthfront blend better homelight pacaso bilt roofstock fundrise qualia snapdocs glean scaleai hebbia clay retool hex posthog kajabi alteryx acorns veritone tebra loandepot experian rivian coreweave databricks vanta rippling lattice gong amplitude mixpanel intercom squarespace wayfair etsy peloton oscar hinge match tinder bumble thumbtack angi opendoor compass redfin zillow realtor offerpad vacasa sonder bench pilot justworks deel remote gorgias klaviyo attentive yotpo shopify bigcommerce toast lightspeed squareup block cashapp marqeta stash dave albert varo current monzo n26 revolut wise nubank payoneer bill expensify navan tripactions airbnb vrbo hopper kayak booking xai perplexity character runwayml elevenlabs cohere together mistral harvey sierra decagon writer jasper descript loom miro notion linear vercel netlify supabase replit sourcegraph codeium cognition ramp mercor micro1 turing outlier invisible labelbox surgehq handshake".split()
ASH="notion linear ramp vercel openai perplexity cursor anysphere lovable replit harvey sierra decagon writer elevenlabs cohere clay attio posthog supabase hebbia runway pika suno mercor micro1 1password deel ashby whatnot plaid benchling modal baseten character poolside mistral ironclad clerk resend raycast warp tome gamma hex dbt retool vanta drata sentry cal zip rho mercury brex ramp found bilt jerry pacaso homebound belong arrived landis".split()
LV="palantir netflix spotify plaid mistral outreach zoox eventbrite kajabi veritone lendingtree anduril figure shieldai whoop ro hims atlassian binance kraken gemini chainalysis consensys uniswap alchemy ledger".split()
import argparse
_a=argparse.ArgumentParser(); _a.add_argument('--kw',default=r'design'); _a.add_argument('--sen',default=r'senior|sr\.?|lead|staff|principal|head|director|manager|creative'); _a.add_argument('--no-skip',action='store_true',help='keep engineer/graphic/etc. titles the design scan drops')
ARGS=_a.parse_args()
KW=re.compile(ARGS.kw,re.I); SEN=re.compile(ARGS.sen,re.I)
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20) as r: return json.load(r)
    except Exception as e: return None
def gh(s):
    d=get(f"https://boards-api.greenhouse.io/v1/boards/{s}/jobs")
    if not d: return []
    return [("GH",s,j['title'],j.get('location',{}).get('name',''),j.get('updated_at','')[:10],j.get('first_published',j.get('updated_at',''))[:10] if j.get('first_published') else '',j['absolute_url']) for j in d.get('jobs',[]) if KW.search(j['title'])]
def ash(s):
    d=get(f"https://api.ashbyhq.com/posting-api/job-board/{s}?includeCompensation=true")
    if not d: return []
    out=[]
    for j in d.get('jobs',[]):
        if KW.search(j['title']):
            comp=(j.get('compensation') or {}).get('compensationTierSummary','') or ''
            out.append(("ASH",s,j['title'],(j.get('location') or '')+(' [remote]' if j.get('isRemote') else ''),j.get('publishedAt','')[:10],comp,j.get('jobUrl')))
    return out
def lv(s):
    d=get(f"https://api.lever.co/v0/postings/{s}?mode=json")
    if not isinstance(d,list): return []
    import datetime
    return [("LV",s,j['text'],j.get('categories',{}).get('location',''),datetime.datetime.fromtimestamp(j['createdAt']/1000).strftime('%Y-%m-%d'),j.get('workplaceType',''),j['hostedUrl']) for j in d if KW.search(j['text'])]
tasks=[(gh,s) for s in GH]+[(ash,s) for s in ASH]+[(lv,s) for s in LV]
with cf.ThreadPoolExecutor(24) as ex:
    for res in ex.map(lambda t:t[0](t[1]),tasks):
        for r in res:
            if SEN.search(r[2]) and (ARGS.no_skip or not re.search(r'engineer|graphic|industrial|mechanical|hardware|packaging|interior|instructional|sound|game|level|narrative|analog|circuit|chip|asic|physical',r[2],re.I)):
                print(" | ".join(map(str,r)))
