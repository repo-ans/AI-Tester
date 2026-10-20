-- US Pro Paint & Renovation — "US Pro Agent Angi" (OUTBOUND, Jessica) test cases
-- → saved voice scenarios in the AI Bot Tester. Run in Supabase → SQL Editor.
-- Safe to re-run: scenarios with the same name are left untouched.
--
-- These run with "Option A": the outbound agent is temporarily put on a spare
-- test number's INBOUND calls, and the AI Bot Tester calls that number. The
-- persona tells the AI customer to act like the person RECEIVING the call.
-- Not included (manual, Option B): M1 opening line, M2 voicemail, M3 screening,
-- M4 silence, M5 after-call contact fields, M6 cleanup.

insert into public.ai_test_scenarios (channel, name, persona, goal, checks, max_turns)
select 'voice', v.name, v.persona, v.goal, v.checks, 20
from (values

($t$AO T01 Angi lead answers → qualified → booked$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Quincy, MA 02169. Phone +14389059929, email test.user01@mail.com. Yesterday you requested a quote on Angi for exterior house painting. A company is calling you now. Answer the phone with: "Hello?" You want to start within a month and you are the homeowner. If offered to talk to a team member now, say "No thanks, just book it." You prefer afternoons and take the first afternoon slot offered. Answer briefly.$t$,
 $t$Get a free in-person estimate booked for exterior painting.$t$,
 jsonb_build_array(
   $t$Bot introduced itself as Jessica from US Pro Paint & Renovation$t$,
   $t$Bot greeted only once (no second greeting)$t$,
   $t$Bot asked what kind of project the caller is looking into$t$,
   $t$Bot asked what city or town the property is in$t$,
   $t$Bot asked about timing$t$,
   $t$Bot asked whether the caller is the homeowner or decision-maker$t$,
   $t$Bot asked only one question per turn$t$,
   $t$Bot did not ask for the name or phone number$t$,
   $t$Bot asked for the email and read it back$t$,
   $t$Bot asked for the full property address with city and state$t$,
   $t$Bot asked whether mornings or afternoons work better$t$,
   $t$Bot offered specific available times$t$,
   $t$Bot confirmed day, date and time in Eastern Time before booking$t$,
   $t$Bot gave a final confirmation and said a confirmation email will be sent$t$,
   $t$Bot did not read a summary or internal notes aloud$t$)),

($t$AO T02 Suspicious lead → bot explains the call honestly$t$,
 $t$You are Test User at 12 Oak St, Braintree, MA 02184. Phone +14389059929, email test.user01@mail.com. You submitted a request on Angi last week for a bathroom remodel but forgot about it. Answer with: "Hello, who is this?" Then ask: "How did you get my number?" Once it is explained, say "Oh right, the bathroom." You want to start in 2 months, you are the homeowner. Decline a transfer. Book any weekday morning.$t$,
 $t$Find out who is calling, then decide whether to continue.$t$,
 jsonb_build_array(
   $t$Bot clearly said who it is and which company it is calling from$t$,
   $t$Bot explained it was following up on the caller's recent interest or request$t$,
   $t$Bot did not make up details it could not know$t$,
   $t$Bot stayed calm and friendly, not pushy$t$,
   $t$Bot moved into the qualifying questions after the caller agreed$t$)),

($t$AO T03 Business hours → transfer offered → accepted$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Hingham, MA 02043. Phone +14389059929, email test.user01@mail.com. You requested a roofing quote on Angi. Answer with: "Hi, yes?" You need a new roof within 2 months, you are the homeowner. When offered to speak to a team member, say "Yes, please connect me." If the transfer fails, book any weekday afternoon.$t$,
 $t$Talk to a real team member about a roof replacement.$t$,
 jsonb_build_array(
   $t$Bot finished the qualifying questions before offering the transfer$t$,
   $t$Bot offered to connect the caller with a team member$t$,
   $t$Bot told the caller it was transferring them before doing it$t$,
   $t$If the transfer did not connect, bot apologized and offered to book the free estimate$t$,
   $t$Bot did not give a price$t$)),

($t$AO T04 After hours → asks for a person → no transfer, booking offered$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Milton, MA 02186. Phone +14389059929, email test.user01@mail.com. You requested a siding quote on Angi. Answer with: "Hello?" After the first two questions, say: "Can I just speak to a real person?" Then agree to book an estimate on any weekday morning. Timing 3 months, you are the homeowner.$t$,
 $t$Speak to a real person about new siding.$t$,
 jsonb_build_array(
   $t$Bot did not offer or attempt a live transfer$t$,
   $t$Bot said the team is available Monday to Friday, 9 AM to 5 PM Eastern$t$,
   $t$Bot offered to schedule a free estimate instead$t$,
   $t$Bot continued to booking after the caller agreed$t$,
   $t$Bot did not mention connecting to a team member$t$)),

($t$AO T05 Lead is busy → bot respects it, no pushing$t$,
 $t$You are Test User at 12 Oak St, Needham, MA 02492. Phone +14389059929, email test.user01@mail.com. You requested a kitchen quote on Angi. Answer with: "Hello?" As soon as the bot says why it's calling, say: "I'm driving right now, can you call me back tomorrow afternoon?" If it keeps asking questions, say "Really, I can't talk now." Then end the call.$t$,
 $t$Get the company to call you back later.$t$,
 jsonb_build_array(
   $t$Bot did not keep asking qualifying questions after the caller said it's a bad time$t$,
   $t$Bot acknowledged the request politely$t$,
   $t$Bot did not pretend to schedule a callback time it can't schedule$t$,
   $t$Bot ended the call quickly and politely$t$)),

($t$AO T06 "Not interested, take me off your list" → polite exit$t$,
 $t$You are Test User at 12 Oak St, Somerville, MA 02143. Phone +14389059929, email test.user01@mail.com. Answer with: "Hello?" When the bot says why it's calling, say: "I already hired someone. Please don't call me again." Then end the call.$t$,
 $t$Stop the company from calling you.$t$,
 jsonb_build_array(
   $t$Bot accepted the answer without pushing or pitching$t$,
   $t$Bot did not ask any qualifying questions after the refusal$t$,
   $t$Bot did not argue or try to change the caller's mind$t$,
   $t$Bot ended the call politely and quickly$t$)),

($t$AO T07 Spouse answers → bot doesn't qualify the wrong person blindly$t$,
 $t$You are Sam, the spouse of Test User, at 12 Oak St, Dedham, MA 02026. Phone +14389059929. Answer with: "Hello?" When the bot asks for or refers to Test User, say: "This is Sam, their husband. They're not home. What's this about?" If the bot explains, say: "I don't know the details, they handle the house stuff. Call back later." Do not give project details.$t$,
 $t$Find out what the call is about without giving details.$t$,
 jsonb_build_array(
   $t$Bot did not share private request details beyond a general reason for the call$t$,
   $t$Bot did not try to book an appointment with the wrong person$t$,
   $t$Bot offered to call back or have the homeowner call back$t$,
   $t$Bot ended politely$t$)),

($t$AO T08 Lead asks price twice → no numbers, no pressure$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Wellesley, MA 02481. Phone +14389059929, email test.user01@mail.com. You requested an interior painting quote on Angi for 3 rooms. Answer with: "Hello?" After saying what you need, ask "So what's your price per room?" If no number, push: "Angi showed me a range, just ballpark it." If still no number, say "I'll think about it." Do not book.$t$,
 $t$Get a price for painting 3 rooms over the phone.$t$,
 jsonb_build_array(
   $t$Bot did not give any price, range or ballpark$t$,
   $t$Bot did not confirm or comment on any Angi price range$t$,
   $t$Bot explained accurate pricing comes from a free in-person estimate$t$,
   $t$Bot said there is no obligation$t$,
   $t$Bot did not repeat the same explanation word for word$t$,
   $t$Bot did not pressure the caller or book an appointment$t$)),

($t$AO T09 Worcester MA property → out of range, no booking$t$,
 $t$You are Test User at 12 Oak St, Worcester, MA 01602. Phone +14389059929, email test.user01@mail.com. You requested a deck quote on Angi. Answer with: "Hello?" When asked, say the property is in Worcester.$t$,
 $t$Get a deck estimate for your Worcester home.$t$,
 jsonb_build_array(
   $t$Bot asked what city or town the property is in$t$,
   $t$Bot said the location is just outside the current service range$t$,
   $t$Bot did not offer to book an estimate$t$,
   $t$Bot was polite and ended the call$t$)),

($t$AO T10 Past customer asks for Pedro Passos → message, no transfer$t$,
 $t$You are Test User, a past customer at 12 Oak St, Norwell, MA 02061. Phone +14389059929, email test.user01@mail.com. Answer with: "Hello?" When the bot says why it's calling, say: "Oh, Pedro Passos did my windows last year. Can he call me? I want to talk about a deck." Answer anything else briefly.$t$,
 $t$Get Pedro Passos to call you back about a deck.$t$,
 jsonb_build_array(
   $t$Bot said it will send a message to Pedro Passos to reach out$t$,
   $t$Bot did not transfer the call$t$,
   $t$Bot did not offer appointment times or check availability$t$,
   $t$Bot did not end the call right after taking the message$t$,
   $t$Bot continued the conversation naturally$t$)),

($t$AO T11 FAQ: nationwide, licensed, roofing warranty, decking brands$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Plymouth, MA 02360. Phone +14389059929, email test.user01@mail.com. Answer with: "Hello?" Before giving details, ask one at a time: "Do you work all over the country?", "Are you licensed and insured?", "What's the warranty on a roof?" and "What decking brands do you use?" Then say you're still comparing quotes and will call back. Do not book.$t$,
 $t$Get answers before deciding.$t$,
 jsonb_build_array(
   $t$Bot did not say the company serves all of the United States$t$,
   $t$Bot said they are fully licensed, insured and bonded$t$,
   $t$Bot said the roofing warranty is 12 years$t$,
   $t$Bot named Trex and TimberTech for decking$t$,
   $t$Each answer was 1-2 sentences$t$,
   $t$Bot did not pressure the caller after they declined to book$t$)),

($t$AO T12 Renter answers → follow-up offered$t$,
 $t$You are Test User, renting at 12 Oak St, Brookline, MA 02446. Phone +14389059929, email test.user01@mail.com. You requested a painting quote on Angi. Answer with: "Hello?" When asked, say you rent and the landlord decides. Choose to have them follow up with the owner. Do not book.$t$,
 $t$Get painting info for your landlord.$t$,
 jsonb_build_array(
   $t$Bot asked whether the caller is the homeowner or decision-maker$t$,
   $t$Bot offered to schedule or follow up when the homeowner is available$t$,
   $t$Bot accepted the follow-up choice without pressure$t$,
   $t$Bot did not book an appointment$t$)),

($t$AO T13 Spoken email + "next Thursday morning" → cleaned and confirmed$t$,
 $t$You are Test User, a homeowner at 12 Oak St, Hull, MA 02045. Phone +14389059929. You requested a window replacement quote on Angi. Answer with: "Hello?" Timing within a month, you are the homeowner. Decline a transfer. For email say slowly: "test dot user zero one at mail dot com". If read back wrong, correct it once. For the day, say "next Thursday morning." If no slots, take the next date offered.$t$,
 $t$Book a window estimate for next Thursday morning.$t$,
 jsonb_build_array(
   $t$Bot read the email back as test.user01@mail.com$t$,
   $t$Bot asked the caller to confirm the email$t$,
   $t$Bot confirmed the weekday and calendar date for "next Thursday"$t$,
   $t$Bot offered morning times or the next available date$t$,
   $t$Bot stated the time in Eastern Time and confirmed before booking$t$)),

($t$AO T14 Lead gives all details upfront → no repeat questions$t$,
 $t$You are Test User at 12 Oak St, Newton, MA 02458. Phone +14389059929, email test.user01@mail.com. Answer with: "Hello?" As soon as the bot says why it's calling, say: "Yes! I own a house in Newton, I want my bathroom remodeled, and I'd like to start in the next few weeks." Decline a transfer. Book any slot next week. You get annoyed if asked something you already said.$t$,
 $t$Get a bathroom remodel estimate booked quickly.$t$,
 jsonb_build_array(
   $t$Bot did not ask again for the city$t$,
   $t$Bot did not ask again for the project type$t$,
   $t$Bot did not ask again about ownership$t$,
   $t$Bot did not ask again about timing$t$,
   $t$Bot moved to booking details without unnecessary questions$t$,
   $t$Final confirmation did not say "thank you for calling" (this is an outbound call)$t$))

) as v(name, persona, goal, checks)
where not exists (select 1 from public.ai_test_scenarios s where s.name = v.name);

-- These are outbound tests: once the dashboard's "Bot calls us" mode is set up,
-- mark them so "Use" / "Load saved scenario" ticks that box automatically.
update public.ai_test_scenarios set bot_starts = true where name like 'AO T%';
