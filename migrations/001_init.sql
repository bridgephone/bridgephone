create table users (
  id serial primary key,
  email text not null unique,
  name text
);

create table sessions (
  token text primary key,
  user_id int not null references users on delete cascade,
  expires_at timestamptz not null
);

create table clubs (
  id serial primary key,
  name text not null
);

create table memberships (
  club_id int not null references clubs on delete cascade,
  user_id int not null references users on delete cascade,
  role text not null check (role in ('manager', 'player')),
  primary key (club_id, user_id)
);

create table tournaments (
  id serial primary key,
  club_id int not null references clubs on delete cascade,
  name text not null,
  state text not null default 'draft' check (state in ('draft', 'running', 'finished')),
  created_at timestamptz not null default now()
);

create table pairs (
  id serial primary key,
  tournament_id int not null references tournaments on delete cascade,
  number int not null,
  player1_id int not null references users,
  player2_id int not null references users,
  unique (tournament_id, number),
  check (player1_id <> player2_id)
);

-- One row of the schedule: in a round, at a table, NS plays EW on some boards.
create table sittings (
  id serial primary key,
  tournament_id int not null references tournaments on delete cascade,
  round int not null,
  table_number int not null,
  ns_pair_id int not null references pairs on delete cascade,
  ew_pair_id int not null references pairs on delete cascade,
  boards int[] not null,
  unique (tournament_id, round, table_number),
  check (ns_pair_id <> ew_pair_id)
);

create table scores (
  sitting_id int not null references sittings on delete cascade,
  board int not null,
  ns_score int not null,
  entered_by int not null references users,
  primary key (sitting_id, board)
);
