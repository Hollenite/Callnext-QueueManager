# RPC-only writes with SKIP LOCKED

Queue writes go through Postgres functions (`join_queue`, `call_next`, `finish_entry`, `leave_queue`) instead of client inserts/updates, and `call_next` locks the oldest waiting row with `FOR UPDATE SKIP LOCKED`.

A custom WebSocket server cannot hold connections on Vercel. Supabase Realtime already fans out row changes, so the database is both the lock manager and the live feed. Two owners hitting Call next at once must not receive the same customer; skip-locked row selection in one transaction is the straightforward way to get that on Postgres, and RLS-only table grants keep anonymous clients from writing rows except through those functions.
