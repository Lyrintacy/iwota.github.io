"""Reproducible, original vector artwork. No remote asset dependency."""
from pathlib import Path
import random, math
random.seed(22)
p=Path(__file__).resolve().parents[1]/'public/art'
def svg(name,body,view='0 0 800 720'):
 (p/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" preserveAspectRatio="none">{body}</svg>')
svg('mark.svg','<rect width="64" height="64" rx="16" fill="#d5ed81"/><path d="M12 25L19 43L29 25L37 43L48 22M11 17L23 13M44 50L55 46" fill="none" stroke="#151814" stroke-width="5"/>','0 0 64 64')
# A scratchy, hand-inked portal on a floating island.
b='''<defs><radialGradient id="h"><stop stop-color="#d5ed81" stop-opacity=".13"/><stop offset="1" stop-color="#d5ed81" stop-opacity="0"/></radialGradient><pattern id="lines" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(23)"><path d="M0 0V7" stroke="#a9ba7b" stroke-width=".65" opacity=".35"/></pattern><linearGradient id="door" x2="0" y2="1"><stop stop-color="#d5ed81"/><stop offset="1" stop-color="#899b53"/></linearGradient></defs>
<ellipse cx="405" cy="345" rx="375" ry="325" fill="url(#h)"/>
<g fill="none" stroke="#717b5c" stroke-width="1"><ellipse cx="409" cy="325" rx="249" ry="243" stroke-dasharray="2 10"/><path d="M111 325H706M409 63V625" stroke-dasharray="2 9"/><path d="M155 591L644 86M147 96L683 571" opacity=".3"/></g>
<g stroke="#d5ed81" fill="none"><path d="M603 76V111M586 94H620M182 190V218M169 204H196M650 429V453M638 441H663"/><circle cx="611" cy="204" r="4"/><circle cx="199" cy="410" r="3"/><path d="M106 319L113 330L105 341L99 330Z"/></g>
<g stroke="#d5ed81" fill="none" opacity=".6"><path d="M534 570q48 18 81-2m-10-4 10 4-7 10"/><path d="M183 118q-31 26-26 60m-6-7 6 7 7-8"/></g>
<g transform="rotate(-7 415 330)">
<path d="M238 472L206 518L262 534L279 578L311 565L355 639L387 591L433 606L473 568L511 570L531 532L587 512L564 467Z" fill="#1c2219" stroke="#b9c89b" stroke-width="2"/>
<path d="M238 482L303 517L352 505L409 539L471 501L541 520L570 483M279 531L310 551L353 530L388 587M321 537L355 610L374 571M454 530L443 580L476 550M520 526L494 551M245 513L271 520" fill="none" stroke="#7e8b64" stroke-width="1.5"/>
<path d="M231 473Q402 415 570 471L591 493Q410 544 208 500Z" fill="#2b3422" stroke="#ccd8b4" stroke-width="2"/>
<path d="M243 477Q402 433 562 478L574 489Q400 526 226 496Z" fill="url(#lines)"/>
<!-- asymmetrical ruined arch -->
<path d="M280 472L278 267L290 259L289 224L309 216L303 189L342 163L344 143L383 125L416 136L444 120L480 151L504 154L514 192L536 205L539 245L552 270L546 476L499 484L498 280Q493 207 425 198Q354 189 337 276L337 477Z" fill="#343c28" stroke="#d3dfba" stroke-width="2.5"/>
<path d="M298 470L299 271L312 233L327 212L349 181L383 158L417 162L450 148L480 176L495 208L515 253L516 478" fill="none" stroke="#758560" stroke-width="2"/>
<path d="M337 477L339 277Q352 200 418 200Q495 197 498 280L498 484Z" fill="url(#door)" stroke="#e8f3c3" stroke-width="3"/>
<path d="M353 470V282Q359 221 417 217Q478 216 481 279V476" fill="none" stroke="#2d381f" stroke-width="1.5"/>
<g fill="none" stroke="#b3c397" stroke-width="1"><path d="M281 304L337 301M281 344L337 346M280 396L337 392M280 439L337 441M499 321L549 314M499 373L548 365M499 418L547 424M493 250L537 238M480 217L516 194M456 202L483 156M419 198L416 139M382 205L361 144M349 232L310 209M337 263L289 251"/></g>
<g fill="#1c2517"><path d="M306 295L311 270L321 281L313 317Z"/><path d="M521 395L531 369L533 414L526 431Z"/><path d="M399 165L414 176L403 182L390 180Z"/><path d="M308 431L316 416L321 450L313 454Z"/></g>
<!-- weird landscape inside the gateway -->
<path d="M354 408L372 385L386 390L405 350L427 380L446 368L480 417V475L354 470Z" fill="#778d4b"/>
<path d="M354 437L392 409L415 429L437 398L481 434V476L354 470Z" fill="#4e6235"/>
<path d="M354 457L387 443L416 462L450 435L481 450V476L354 470Z" fill="#2d4026"/>
<circle cx="419" cy="287" r="28" fill="#e5f2b4"/><path d="M395 281l44 12m-46-3 42 11m-37-30 42 12" stroke="#afc275" stroke-width="1"/>
<path d="M404 477L414 454L426 465L432 479" fill="#e9efcc"/>
<!-- stairs -->
<path d="M369 479L443 485L453 500L447 505L461 519L455 525L466 540L455 546L466 560L449 567L461 581L440 591L341 570L344 555L347 548L351 534L355 525L359 512L364 504Z" fill="#b6c196" stroke="#172018" stroke-width="2"/>
<path d="M367 491L450 503M362 509L456 522M355 529L461 542M350 548L461 562M344 565L457 583" stroke="#2a3624" stroke-width="3"/>
<path d="M376 482L355 568M389 486L372 572" stroke="#eef0d1" opacity=".7"/>
</g>
<!-- foreground mushrooms and wild brambles -->
<g fill="none" stroke="#becb9f" stroke-width="2"><path d="M238 490Q245 430 226 391M241 455L217 440M239 438L261 416M233 414L218 408M543 485Q557 434 585 416M554 456L581 453M565 437L568 413M538 488Q540 458 521 442"/><path d="M251 491L268 475L271 451M563 493L587 475L597 446"/></g>
<g fill="#d5ed81" stroke="#202719" stroke-width="2"><path d="M197 434Q213 402 235 434Z"/><path d="M569 454Q593 416 614 454Z"/><path d="M248 456Q268 435 282 455Z"/><path d="M507 447Q521 424 535 447Z"/></g>
<g stroke="#d5ed81" stroke-width="1" fill="none"><path d="M196 553l-19 32 40-17M573 341l43-25-9 35M276 130l-19-23 31 8"/></g>
<!-- a little wanderer -->
<g transform="translate(370 516) rotate(-7)"><path d="M0 0L-4 21M2 1L9 19M-3-20L-8 0L7 1L5-19Z" fill="#182016" stroke="#e1e8c7" stroke-width="2"/><circle cy="-27" r="9" fill="#1c281b" stroke="#e1e8c7" stroke-width="2"/><path d="M-7-17L-17-5L-11 1M5-16L13-5L20-16M19-23L23 22" stroke="#e1e8c7" stroke-width="2" fill="none"/><path d="M-8-30L-14-34L0-40L6-32" fill="#d5ed81"/></g>
'''
for i in range(100):
 x=random.randint(140,660); y=random.randint(100,625)
 if 265<x<550 and 120<y<560:continue
 b+=f'<circle cx="{x}" cy="{y}" r="{random.choice([.6,1,1.3])}" fill="#cdd8a2" opacity=".45"/>'
svg('hero.svg',b)
# repeatable vertical frame, identical edge coordinates to avoid seams
b='<path d="M0 0H47L56 34L32 71L70 115L48 159L80 200L54 246L71 284L49 326L75 365L51 410L65 459L47 500H0Z" fill="#10150f" stroke="#6b7655" stroke-width="1.3"/>'
b+='<path d="M14 0L27 54L16 104L38 162L23 206L42 250L23 307L36 351L20 402L30 451L14 500M0 52L27 54L50 35M16 104L53 98M38 162L59 143M23 206L69 214M42 250L63 263M23 307L64 298M36 351L62 345M20 402L57 392M30 451L57 468" stroke="#35432d" fill="none"/>'
for i in range(32):
 y=i*15+4;x=random.randint(7,40)
 b+=f'<path d="M{x} {y}l{random.randint(3,12)} -6" stroke="#76815b" stroke-width=".7" opacity=".45"/>'
svg('border.svg',b,'0 0 95 500')
svg('roof.svg','<path d="M0 0H1600V58L1510 36L1490 68L1430 48L1400 62L1375 37L1280 56L1190 29L1120 49L1070 28L990 43L930 24L865 43L800 25L730 48L645 29L570 49L480 30L402 58L326 34L250 67L189 46L143 78L100 53L63 93L34 76L0 112Z" fill="#151814"/><path d="M0 113L34 77L63 94L100 54L143 79L189 47L250 68L326 35L402 59L480 31L570 50L645 30L730 49L800 26L865 44L930 25L990 44L1070 29L1120 50L1190 30L1280 57L1375 38L1400 63L1430 49L1490 69L1510 37L1600 59" stroke="#596346" fill="none"/>','0 0 1600 115')
svg('portal.svg','<g fill="none" stroke="#d5ed81"><path d="M150 12L169 34L198 20L204 51L240 48L230 79L266 94L245 115L280 143L248 157L269 191L234 195L239 233L205 224L192 260L169 239L147 280L130 243L94 263L90 230L53 235L63 201L27 189L52 161L17 141L51 124L31 91L67 88L59 49L97 60L109 22L133 45Z" stroke-width="3"/><ellipse cx="148" cy="147" rx="94" ry="103" transform="rotate(27 148 147)" stroke-width="8"/><ellipse cx="148" cy="147" rx="73" ry="87" transform="rotate(-24 148 147)" stroke-width="3"/><path d="M190 91C91 24 48 190 137 216C222 238 238 111 172 105C96 93 85 189 146 186C190 183 178 134 151 143C130 151 146 171 156 160" stroke-width="7"/></g>','0 0 300 300')
svg('card-frame.svg','<path d="M16 2L35 5L130 2L158 14L156 40L158 190L145 218L112 215L20 218L3 201L5 30Z" fill="#20251d" stroke="#d5ed81" stroke-width="2"/><path d="M17 13L142 14L145 203L17 204Z" fill="none" stroke="#76815b"/>','0 0 160 220')
# Landscape footer, foreground has higher priority than borders.
b='<path d="M0 160L45 92L64 150L108 125L151 189L204 168L249 220L305 195L353 237L412 213L463 253L513 221L570 259L624 239L698 267L775 254L858 271L959 240L1040 258L1090 220L1148 244L1222 188L1282 215L1344 149L1412 188L1465 113L1496 148L1534 67L1561 119L1600 89V400H0Z" fill="#0a0d09" stroke="#4e593f"/>'
for x in [25,78,143,205,1310,1380,1480,1550]:
 y=random.randint(50,125)
 b+=f'<path d="M{x} 300L{x+8} {y}M{x+7} {y+30}l-35 -26m33 58 41-36m-44 95-45-36m46 6 38-28" fill="none" stroke="#0a0d09" stroke-width="10"/>'
svg('ending.svg',b,'0 0 1600 400')
b='<rect width="800" height="520" fill="#211c2c"/><defs><radialGradient id="n"><stop stop-color="#c3adf2" stop-opacity=".6"/><stop offset="1" stop-color="#302b47" stop-opacity="0"/></radialGradient></defs><circle cx="400" cy="260" r="260" fill="url(#n)"/>'
for i in range(350):
 a=random.random()*math.pi*2;r=random.random()**.45*220;x=400+math.cos(a+r/55)*r*1.4;y=260+math.sin(a+r/55)*r*.7
 b+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{random.uniform(.5,2.4):.1f}" fill="{random.choice(["#d7cbff","#9675c1","#e8e4d9"])}"/>'
b+='<g fill="none" stroke="#c3adf2" opacity=".6"><ellipse cx="400" cy="260" rx="180" ry="65" transform="rotate(-32 400 260)"/><ellipse cx="400" cy="260" rx="145" ry="85" transform="rotate(48 400 260)"/><circle cx="400" cy="260" r="51"/></g>'
svg('nebula.svg',b,'0 0 800 520')
b='<rect width="800" height="520" fill="#2a211e"/>'
for j in range(25):
 pts=[]
 for i in range(71):
  x=50+i*10;y=135+j*10+math.sin(i*.13+j*.1)*35+math.sin(i*.29+j*.16)*math.sin(i/70*math.pi)*70
  pts.append(f'{x:.1f},{y:.1f}')
 b+=f'<polyline points="{" ".join(pts)}" fill="none" stroke="#edae88" stroke-width="1" opacity="{.25+j/40}"/>'
b+='<circle cx="598" cy="124" r="35" fill="none" stroke="#edae88"/><path d="M550 124H646M598 76V172" stroke="#edae88" opacity=".3"/>'
svg('soundscape.svg',b,'0 0 800 520')
