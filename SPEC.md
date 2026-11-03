# Bridgephone

Bridgephone is a mobile-first webapp for running bridge pairs tournaments at a bridge club. Players enter the score of each board they play, Bridgephone compares the scores and decides the winner.

## Terms

- **Board**: one deal of cards. A tournament has 24 boards, and each board is played at several tables.
- **Pair**: two players who play together for the whole tournament.
- **Round**: in each round, every pair sits at a table as North-South (NS) or East-West (EW) against another pair and plays a few boards.

## Roles

- **Site admin**: creates bridge clubs and assigns their club managers.
- **Club manager**: manages the members of a club and creates and runs tournaments.
- **Player**: plays in tournaments and enters scores.

A person can be a member of more than one club.

## Members and login

A club manager adds a member to the club by email address. That person can then log in with the Google account for that email address. Google is the only way to log in.

## Tournament

A tournament belongs to one club and goes through three states.

### 1. Draft

The club manager:
- forms the pairs from club members (each player is in at most one pair),
- enters the schedule: for each round and table, the NS pair, the EW pair and the boards they play.

When the setup is done, the club manager starts the tournament.

### 2. Running

- For every board played at a table, either pair at that table can enter the score as one number: the **NS score** (e.g. `+420` or `-100`).
- There is one score per board per table. Either pair at the table can change it while the tournament is running.
- Players see only the scores at their own tables.

The club manager closes the tournament when play is over.

### 3. Finished

- Scores are locked.
- All players who took part see the final ranking and all scores.

## Scoring

For each board, every NS score is compared with all other NS scores on that board:
- 2 matchpoints for each score it beats,
- 1 matchpoint for each score it ties.

The EW pair at that table gets the remaining matchpoints (the maximum minus the NS matchpoints).

A pair's result is its total matchpoints as a percentage of the maximum it could have scored on the boards it played. The pair with the highest percentage wins.

## Out of scope

- Team (IMP) scoring
- Entering contract, declarer and tricks instead of the score
- Handicaps, player ratings or history across tournaments
- Notifications
- Login methods other than Google
