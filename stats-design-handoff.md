# Poker Night — Player detail

Design handoff. Self-contained: everything needed to design this is in this file.
Written for a designer who has not seen the app.

**Status:** problem defined and scoped, design open. No screen exists yet.

---

## 1. The app in a paragraph

A phone-first app for running a home poker cash game. **One person — the host —
holds the phone all night.** Everyone else is a name on a list; nobody else
installs anything. The host tracks buy-ins, counts everyone down at the end, and
the app settles the night. All data is local to that one device. No accounts.

Because of that, the app is not one person's records. **It is the group's ledger,
kept on the host's phone.** That distinction drives §6.1.

## 2. What this screen is

One player, across every night they have played. Reached by tapping a person in
the **Ledger** (all-time standings) or in **Players** (the roster).

It answers, in this order:

1. How is this person doing, over time
2. How much do they actually play
3. What are they like at the table

**It is not** a coaching tool and it cannot be one; see §4.

## 3. The constraint that decides everything

**A home game runs every other week at best. Assume 8 to 26 nights of history,
and design for the low end.**

Nearly all poker statistics were built for online players with tens of thousands
of hands. Almost none of it survives contact with n=14. A win rate over eight
sessions is noise wearing a percentage sign. A trend line through six points is a
lie with a slope.

So the brief is not "which stats." It is **"which stats survive n=14"** — and the
answer is counting stats, not rates.

Design implications:

- Every dollar figure carries its denominator: `+$412 over 13 nights`, never a
  bare `+$412`.
- The screen must look considered at **one** night of history, not just twenty.
- Nothing may imply a trend, a projection, or momentum.

## 4. Two things the data cannot support

State plainly so they are not designed in by accident.

**Head-to-head does not exist.** In a cash game the pot is communal. When someone
is up $55 there is no way to attribute whose money that was. Any "record against
Sam" or rivalry feature would be fabricated. Some competing apps ship this anyway.

**Skill is not separable from variance** at this volume. A rising line over twenty
home-game nights implies almost nothing about ability. The screen should not sell
that fantasy, and language like "form" or "improving" would.

## 5. Data available

Per player, per night, from saved history:

```
totalIn   sum of that night's buy-ins        (integer cents)
out       what they left with               (integer cents)
net       out - totalIn, signed
entries   how many separate buy-ins they made
date      when the night ended
duration  how long the night ran
```

There are no hands, no positions, no pot sizes. The stat space is genuinely
small; anything claiming more insight than the above is invented.

Derived and worth showing:

| Stat | Note |
|---|---|
| Cumulative net | The chart. See §6.2. |
| Nights played | The denominator for everything else |
| Best night / worst night | Single events, so no averaging problem |
| Total bought in | How much action this person takes |
| Buy-ins per night | The closest thing to a play-style read, and it is funny |
| Attendance | Nights played out of nights held — socially the most interesting |

Behaviour stabilises far faster than money does, which is why most of this list is
behavioural rather than financial.

## 6. What to decide

### 6.1 Whose screen is this

Everyone's history lives on the host's phone, so this is technically a shared
record rather than personal analytics. The real uses are social:

1. **Settling an argument** — "you're not down for the year, you're up ninety"
2. Reading last night back, the morning after
3. Trash talk in the group chat

None of them are self-improvement. **Design question:** does the screen read as
*my performance* or as *the group's record of this person*? It changes the
header, the voice, and whether a figure is built to be quoted or studied.

If the answer is "the group's record," a related question: should any of it be
easy to lift into a message?

### 6.2 The chart

**Cumulative net across sessions** is the one visualization that stays honest
here, because every point is a real event rather than an inferred trend. It is
also the canonical poker graph, so it needs no explanation to this audience.

Requirements, all of which exist to stop it lying:

- **X is session index, not calendar date.** Real dates open month-wide gaps that
  read as droughts when they are only a skipped fortnight.
- **Zero baseline is the reference** and should be legible as such.
- **No gridlines and no y-axis ticks.** Label the zero line and the final value.
- **Colour by the final sign**, using the money colours in §7. Never the accent —
  see the note there about what brass means.
- **Not interactive.** At twenty points the tap targets are smaller than a
  fingertip and there is nothing underneath to reveal.

**Design questions:** How does it look at one night, and at two? A single point is
a dot, not a line, and this is where most chart work falls over. Where does the
chart sit relative to the stats — does it lead, or does a headline number lead
and the chart support it?

Note for consistency: the app's only existing chart is a set of **diverging
horizontal bars** on the night report, one row per player around a centre zero
line. A line chart is a new primitive here. That is acceptable, but it should
look like it belongs to the same product.

### 6.3 What the entry point looks like

Two lists lead here — the Ledger's ranked all-time standings, and the Players
roster. Neither currently has any affordance suggesting a row leads anywhere.

**Design question:** what changes on those rows, and is a sparkline in the Ledger
row worth its space or is it decoration at this data volume?

### 6.4 The default view of the Ledger

Related, and worth raising because the answer may be "leave it alone."

The Ledger currently ranks everyone 1 through 6 with the biggest loser at the
bottom in red, and it is the default view of that tab. Among friends that is
trash talk and probably fine. It also means the person down $444 sees their
position every time they open it.

**Design question:** is that the right default, or should the tab open on
something else with the ranking one step in? This is a judgement call about a
product where the money is real and the players are friends.

## 7. Visual language

Dark, warm. "One lamp over a dark table."

```
--table:    #141110   page background        --chalk:  #F3ECE3   text
--felt:     #1D1917   cards                  --smoke:  #A69890   muted, 5.9:1 on felt
--rail:     #292320   inputs, secondary      --brass:  #E9A13B   action
--hairline: #38302B   borders                --up:     #5DBE8C   positive money
                                             --down:   #E4695A   negative money
```

**The split is load-bearing.** Brass means "you can touch this." Green and red
only ever describe money. A chart line in brass would read as tappable; a button
in green would read as a positive amount.

Player identity is a coloured circle with initials, from eight clay-chip hues,
assigned in roster order and permanent per player. It is also the disambiguator
for two players sharing a first name.

Radii 16px cards, 13px stat cards, 12px controls. System sans. **Every figure uses
tabular numerals** — the app has money in columns throughout and a proportional
face breaks the alignment. Money is `$20`, never `$20.00`; cents only when
non-zero. Nets always carry a sign: `+$40`, `-$30`, `$0`.

Phone portrait only. Design at 390×844, must hold 375 to 430.

## 8. States to cover

1. **One night of history.** The hardest state and the one to design first.
2. Two or three nights — a line with barely any line
3. A player who is dead even across many nights
4. A player who has never finished a night (in the roster, no history)
5. Twenty-plus nights, where the chart is dense
6. A single catastrophic night dominating the vertical range
7. Very long name
8. A player who has stopped coming — last played months ago

## 9. Copy

Direct and dry. Never the word "user." Never "successfully." Numbers over
adjectives. Existing lines elsewhere in the app that set the tone:

```
Everyone broke even.  /  Rare and beautiful.
No games yet.  /  Finish a night and it lands here.
Off by $15
```

Avoid entirely: "form," "streak," "on pace," "improving," "due." These frame
variance as momentum, which is the exact cognitive error that makes people chase
losses — in an app about real money between friends.

## 10. Out of scope

- Win rate as a percentage
- Streaks, form, momentum, or any projection
- Head-to-head or rivalry, which the data cannot support (§4)
- Filtering by date range or stake
- Editing any figure from here
- Comparing two players side by side
- Anything requiring hand-level data, which does not exist

## 11. Deliverable

Frames at 390×844, dark. **States over screens:** the same player at one night,
at three, and at twenty is three frames and is the centre of this.

Include whichever of §6.1–6.4 you resolve, and say where you have diverged from
this and why. The shape described here is a starting point, not a requirement —
if the honest answer is that this should be a section on an existing screen
rather than a screen of its own, say so.
