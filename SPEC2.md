# Bridgephone: next version

This spec builds on [SPEC.md](SPEC.md). Everything in SPEC.md stays the same unless a section below changes it. The goal of this version is that a club manager can run a normal club evening with 8–16 pairs entirely in Bridgephone.

The features are in three phases. Each phase is useful on its own.

---

## Phase 1: a real club evening

### Ready-made schedules

When setting up a tournament, the club manager chooses a **movement** instead of typing in the schedule:

- **Howell**: every pair plays against every other pair. Used for small groups, up to about 10 pairs.
- **Mitchell**: NS pairs stay at their table, EW pairs move one table up each round, and the boards move one table down. Used for larger groups.

The manager enters the pairs and picks the movement. Bridgephone then shows which movements fit that number of pairs, with the number of rounds and boards per round (for example "8 pairs, Howell, 7 rounds of 3 boards"). Bridgephone then fills in the schedule. The number of boards follows from the movement and is no longer fixed at 24.

The manager can still enter a schedule by hand, as in SPEC.md.

### An odd number of pairs

With an odd number of pairs, the schedule includes a **sit-out**: in each round one pair doesn't play. A pair's percentage only counts the boards it played (as in SPEC.md), so the sit-out is fair.

### "Where do I go now?"

While a tournament is running, a player's tournament page shows the **current round** first:
- their table and direction (NS or EW),
- their opponents,
- the boards to play,
- or "You sit out this round".

When the pair has entered all scores of the round, the page moves on to the next round. The full schedule stays available below.

The manager starts each next round, so all tables move together. The manager's page shows which tables are still busy.

### Entering the contract

Instead of the score, a player enters:
- the **contract** (level, suit or no trumps, doubled or redoubled),
- the **declarer** (N, E, S or W),
- the **number of tricks** taken, or a result such as "+1" or "−2".

Bridgephone calculates the NS score using standard duplicate bridge scoring. The vulnerability and the dealer follow from the board number in the standard way, and the score form shows them. A board that is passed out is entered as **"pass"**.

### The opponents confirm

When one pair enters a result, the other pair at the table sees it and **confirms** it. If they disagree, either pair can change it, after which the other pair confirms again.

Unconfirmed results still count, but are marked as such on the manager's page.

---

## Phase 2: the club manager's tools

### Corrections

The club manager can change any result:
- while the tournament is running,
- after it is finished. The ranking is then recalculated.

The manager can also **reopen** a finished tournament, which puts it back in the running state.

### Adjusted scores

When a board could not be played at a table, the manager gives that table an **adjusted score** instead of a result:
- **Average** (50%), **average plus** (60%) or **average minus** (40%),
- given separately to the NS pair and the EW pair (for example, average plus to one side and average minus to the other).

An adjusted score counts for the pair at that table with its percentage. It doesn't change the matchpoints of the other tables on that board.

### Substitutes

The manager can replace a player in a pair during the tournament. The pair keeps its results.

### Printing and sharing results

A finished tournament has a **results page** that:
- shows the ranking and all boards,
- fits on paper when printed,
- can be shared by link with people who don't have an account, if the manager chooses to.

---

## Phase 3: keeping members involved

### Signing up

The club manager can open a tournament for **sign-up** before it starts. Members:
- sign up together with a partner, or
- sign up alone, to find a partner.

The manager forms the pairs from the sign-up list.

### History and club ladder

For each member, Bridgephone shows:
- the tournaments they played, with their rank and percentage,
- their average percentage over a chosen period (for example, the current season),
- their results per partner.

A club has a **ladder**: the members ranked by average percentage over the chosen period. The manager decides the minimum number of tournaments for a member to appear on it.

### Hand records

The club manager can add the **deals** (the cards of the four hands) to a finished tournament, by uploading the file the club's dealing machine produces. Players then see each board's hands together with the results at every table.

---

## Out of scope for this version

Still out of scope, as in SPEC.md:
- team (IMP) scoring,
- handicaps,
- notifications,
- login methods other than Google.

New for this version:
- entering scores without an internet connection,
- rating systems (rankings across clubs or national ratings),
- linking to bridge federations or their membership systems.
