# Live Queue

A clinic or salon desk runs one live line. People at the desk call names. People waiting watch their place on their own phone.

## Language

**Owner**:
The person who runs the queue from the desk.
_Avoid_: admin, staff, user, merchant

**Customer**:
A person waiting in the queue, identified only by a display name on this visit.
_Avoid_: client, guest, patient, user

**Queue**:
The live line an owner opens for a desk, with a name and an optional default service time.
_Avoid_: room, session, location, shop

**Entry**:
One customer's place in a queue, from join until they are done, marked no-show, or leave.
_Avoid_: ticket (except as on-screen shorthand), job, appointment, booking

**Call next**:
The owner action that takes the oldest waiting entry and starts serving it.
_Avoid_: dequeue, pop, process, advance

**Client token**:
A random id stored in the customer's browser so only that phone can leave its own entry.
_Avoid_: session, cookie, account, password
