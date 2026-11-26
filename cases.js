"use strict";
// Each source slip keeps the original line beside a plain-language reading.
const slips = {
 bell:["01","Ticket desk","18:02","A visitor says the map printer stopped for a moment.","18:02 UTC | desk | ticket=T7 | subject=map printer delay"],
 queue:["02","Print room","18:03","Job P4 waited two minutes for paper. It then printed.","18:03 UTC | print-1 | job=P4 | wait=2min | reason=paper | result=printed"],
 door:["03","Gate reader","18:03","A staff badge opened the east gate.","18:03 UTC | gate-east | badge=staff-8 | result=open"],
 health:["04","Print room","18:06","The next job printed without waiting.","18:06 UTC | print-1 | job=P5 | wait=0min | result=printed"],
 clock:["05","Clock keeper","18:12","The gate uses local time, one hour ahead of the harbour’s UTC clock.","18:12 UTC | gate clock zone=UTC+01:00 | clock checked=ok"],
 late:["06","Gate reader","19:08 local","Badge Blue was accepted at 19:08 on the gate clock. The log desk received this at 18:14 UTC.","19:08 +01:00 | badge=Blue | result=accepted | received=18:14 UTC"],
 file:["07","Map store","18:10","Desk 7 opened tide-map.pdf for reading.","18:10 UTC | user=nia | client=Desk-7 | file=tide-map.pdf | action=read"],
 buffer:["08","Log desk","18:14","The gate reader’s connection returned. It delivered the records it had kept.","18:14 UTC | source=gate-east | queue=delivered | link=restored"],
 deny:["09","Sign-in desk","18:16","Nia’s account had three failed sign-ins from Harbour Wi-Fi.","18:16 UTC | account=nia | entry=Harbour-WiFi | result=failed | count=3"],
 nia:["10","Remote access","18:18","Nia’s account connected from Desk 7 using Harbour Wi-Fi. Its inside address was 10.8.0.7.","18:18 UTC | user=nia | device=Desk-7 | entry=Harbour-WiFi | assigned=10.8.0.7 | result=success"],
 sol:["11","Remote access","18:17","Sol’s account connected from Desk 2 using the same Wi-Fi. Its inside address was 10.8.0.2.","18:17 UTC | user=sol | device=Desk-2 | entry=Harbour-WiFi | assigned=10.8.0.2 | result=success"],
 alert:["12","Log desk","18:19","The automatic alert grouped three records because they share a Wi-Fi entry point.","18:19 UTC | rule=failures_then_success | grouped_by=entry | sources=09,10,11"],
 read:["13","Map store","18:21","Nia’s account on 10.8.0.7 successfully read tide-map.pdf.","18:21 UTC | user=nia | client=10.8.0.7 | action=read | file=tide-map.pdf | result=ok"],
 permit:["14","Change book","18:20","Ticket H4 allows the Ferry desk to send to Chart House between 18:20 and 18:30 UTC.","ticket=H4 | sender=Ferry desk | recipient=Chart House | window=18:20..18:30 UTC"],
 ferry:["15","Traffic desk","18:24","The Ferry desk sent 90 MB to Chart House.","18:24 UTC | from=Ferry desk | to=Chart House | sent_MB=90 | received_MB=1 | allowed=yes"],
 night:["16","Traffic desk","18:25","Inside address 10.8.0.7 sent 8 MB to North Pier. It received 1 MB back.","18:25 UTC | from=10.8.0.7 | to=North Pier | sent_MB=8 | received_MB=1 | allowed=yes"],
 blind:["17","Device monitor","18:23","Desk 7 stopped reporting which programs were running. Other log sources kept working.","18:23 UTC | device=Desk-7 | program_reporting=offline | other_feeds=available"],
 owner:["18","Ticket owner","18:32","I checked H4. It covers the Ferry desk delivery to Chart House only.","18:32 UTC | reply=owner | H4 applies_to=Ferry desk to Chart House"],
 copy:["19","Draft assistant","18:34","Draft for review: “A user stole tide-map.pdf. The computer downloaded 8 MB.”","draft=generated | source_refs=13,16 | review=pending"]
};
const chapters=[
 ["Read a record","Find out why a map was late.","Harbour lights","The printer delay","Write one sentence naming the cause and the record that shows the map printed."],
 ["Fix the clock","Put an evening’s events in order.","Bell tower","The delayed record","Explain why a record of an earlier event reached the desk later."],
 ["Follow the right desk","Untangle two people using one network.","Signal bridge","The shared network","Name two clues that link the map read to Nia’s session."],
 ["Check the delivery","Test two deliveries against a written permit.","Ferry crossing","The delivery permit","Explain which delivery needs review and which permit condition it misses."],
 ["Write the handover","Give the next analyst a fair account.","First light","The morning handover","Tell the next analyst one confirmed fact, one open question and who should investigate."]
];
// kind: choose, pair, order or number. For pair and order, answers are option indexes.
const pick=(q,options,answer,why,hint)=>({kind:"choose",q,options,answer:[answer],why,hint});
const pair=(q,options,answer,why,hint)=>({kind:"pair",q,options,answer,why,hint});
const order=(q,options,answer,why,hint)=>({kind:"order",q,options,answer,why,hint});
const num=(q,answer,unit,why,hint)=>({kind:"number",q,answer:[answer],unit,why,hint});
const rounds=[
 {name:"The quiet printer",ids:["bell","queue","door"],mode:"print",beats:[
 "A visitor asks why the map was late. The ticket records the question.",
 "Inside the print room, the job waits while someone adds paper.",
 "The printer finishes and leaves a log. A log is a record of something a system observed."],tasks:[
 pick("Which slip can tell you whether the map actually printed?",["Ticket desk · 01","Print room · 02","Gate reader · 03"],1,"The printer recorded its own job result.","Look for the machine that produced the map."),
 num("How long did job P4 wait for paper?",2,"minutes","The print room measured a two-minute wait.","Read the wait in slip 02."),
 pick("What can you tell the visitor?",["The east gate broke the printer.","The delay is still unexplained.","Paper ran short, then the job printed."],2,"The print record supplies both the reason and the outcome.","Read the reason and result together.")]},
 {name:"Who saw what?",ids:["door","bell","queue"],mode:"route",beats:[
 "The gate reader sees a badge. It writes down that the gate opened.",
 "The ticket desk hears the visitor. Its record preserves what the visitor reported.",
 "A central log desk collects both slips. Each slip keeps the name of its source."],tasks:[
 pick("Who directly observed the gate open?",["Gate reader","Visitor","Print room"],0,"The gate reader is the source of the open result.","Look for the slip with a badge and a result."),
 pair("Pick the two details the gate reader recorded.",["Who held the badge","Which gate opened","Why the person came","The badge label"],[1,3],"Slip 03 gives the east gate and staff-8. It gives no name or purpose.","Read the original line under slip 03."),
 pick("A colleague needs the visitor’s original wording. Where should they start?",["The paper tray","The ticket desk entry","The gate reader"],1,"The ticket is the place to follow up on the visitor’s report.","Who received the complaint?")]},
 {name:"Close the first ticket",ids:["bell","queue","health"],mode:"print",beats:[
 "The first job pauses. The next job gives you a second observation.",
 "Job P5 passes straight through the printer. Its waiting time is zero.",
 "Send the print team a small, useful update and keep the original records."],tasks:[
 order("Build the sequence from earliest to latest.",["Next job prints without waiting","Visitor reports delay","P4 prints after waiting"],[1,2,0],"The record times are 18:02, 18:03 and 18:06.","Read the time on each slip."),
 pair("Which two slips show that printing resumed and continued?",["01 · Visitor’s ticket","02 · P4 result","04 · P5 result"],[1,2],"Both slips contain results from the printer.","Find the two completed jobs."),
 pick("How should you save the evidence?",["Keep the original slips and write a separate note.","Replace both slips with your conclusion.","Keep only the latest slip."],0,"Another analyst can check the originals alongside your explanation.","Think about what someone else will need to verify your note.")]},
 {name:"Two clock faces",ids:["clock","late","file"],mode:"clock",beats:[
 "The gate clock shows 19:08. The log desk uses a shared time called UTC.",
 "The gate is one hour ahead. Move its hour hand back one hour to compare events.",
 "The gate event now reads 18:08 UTC. The map store records its read at 18:10 UTC."],tasks:[
 pick("Which time did the gate display when the badge worked?",["18:14","19:08","18:10"],1,"The original wall-clock reading stays on slip 06.","Read the line marked local."),
 pick("Convert the gate event to harbour time (UTC).",["20:08","19:08","18:08"],2,"Subtract one hour from the local time. The minutes stay the same.","The gate is one hour ahead."),
 num("How many minutes after the gate event did the map read happen?",2,"minutes","18:10 comes two minutes after 18:08.","Use the converted time, then compare slip 07.")]},
 {name:"The late envelope",ids:["late","file","buffer"],mode:"delay",beats:[
 "The gate creates its record, but the connection to the log desk drops.",
 "The map store’s record gets through while the gate’s envelope waits.",
 "The connection returns at 18:14. The older gate record can finally arrive."],tasks:[
 num("For how many minutes did the gate record wait between event and receipt?",6,"minutes","From 18:08 to 18:14 is six minutes.","Use 18:08 UTC for the badge event."),
 pick("Which slip explains the wait?",["08 · Log desk","07 · Map store","06 · Badge result alone"],0,"Slip 08 says the link returned and the queue was delivered.","Find the source that observed delivery."),
 order("Rebuild the evening using event times.",["Connection returns","Badge works","Map file is read"],[1,2,0],"Badge at 18:08, read at 18:10, link back at 18:14.","A late delivery can describe an early event.")]},
 {name:"Choose the right window",ids:["late","file","buffer","door"],mode:"clock",beats:[
 "A colleague wants the badge event and the map read on one timeline.",
 "Set a small time window around both events, using the same clock.",
 "Keep the receipt time too. It explains why the first view looked out of order."],tasks:[
 pick("Which is the smallest offered UTC window covering the badge and read?",["18:11–18:14","18:07–18:11","All day"],1,"The window includes 18:08 and 18:10 with a little room at either end.","Check both event times."),
 pair("Which two time labels belong in your note about the gate record?",["18:03 · east gate in a different slip","18:08 · event in UTC","18:14 · receipt in UTC","19:10 · estimated"],[1,2],"Labelling each time helps another analyst reproduce the timeline.","You need when it happened and when it arrived."),
 pick("What connects the badge and the file read so far?",["Timing proves the badge holder read the file.","Both records name the same badge.","They happened close together. Their connection is still unknown."],2,"The map record names a desk and account. The badge record supplies no matching identity.","Look for an identifier shared by both slips.")]},
 {name:"One Wi-Fi, two people",ids:["deny","sol","nia","alert"],mode:"split",beats:[
 "Two desks use Harbour Wi-Fi. From outside, their traffic shares an entry point.",
 "An automatic rule gathers sign-in failures and successes at that entry point.",
 "The alert is a question to investigate. Open the source slips to see the two accounts."],tasks:[
 num("How many failures are reported in the one sign-in slip?",3,"failures","A single summary line can count several events.","Read count on slip 09."),
 pair("Which two accounts appear in the successful connections?",["Nia","Ferry","Sol","Blue"],[0,2],"The two remote access slips name Nia and Sol.","Find user in slips 10 and 11."),
 pick("Why did the alert include both accounts?",["Both used Desk 7.","Both shared a Wi-Fi entry point.","Both opened the tide map."],1,"The rule groups by entry. Its group can include different people.","Read grouped_by on slip 12.")]},
 {name:"Follow the address",ids:["nia","sol","read"],mode:"trace",beats:[
 "Remote access lends Nia’s desk an inside address for the session.",
 "The map store records that address when a client asks to read a file.",
 "Follow the same address and account from the session slip to the file slip."],tasks:[
 pick("Which address was lent to Nia’s desk?",["10.8.0.2","10.8.0.7","Harbour-WiFi"],1,"Slip 10 assigns 10.8.0.7 to Desk 7.","Look for assigned in the original."),
 pair("Choose the two slips that connect Nia’s session to the 18:21 read.",["10 · Nia’s session","11 · Sol’s session","13 · Map store"],[0,2],"Both the account and client address agree in 10 and 13.","Compare the user and inside address."),
 pick("Which action did the store observe?",["Deleting the map","Emailing the map","Reading the map"],2,"A successful read says the file was opened for reading.","Find action on slip 13.")]},
 {name:"Test a second explanation",ids:["deny","sol","nia","alert"],mode:"split",beats:[
 "The first explanation says every Wi-Fi event came from the same desk.",
 "Place the two successful sign-ins side by side. Their device names differ.",
 "Keep the failures in scope for review. The records leave room for several explanations."],tasks:[
 order("Arrange these sign-in records by time.",["Nia connects","Nia’s failed entries","Sol connects"],[1,2,0],"18:16 failures, 18:17 Sol, 18:18 Nia.","Read each source time, including the middle one."),
 pair("Which two details distinguish the successful sessions?",["Entry network","Device name","Inside address","Harbour location"],[1,2],"Desk 2 and Desk 7 have different inside addresses.","Find what changes between slips 10 and 11."),
 pick("What do we know about the person behind the failed entries?",["Their identity is still unknown.","It was definitely Sol.","It was definitely a thief."],0,"The sign-in slip names the account used. Several people or processes might try an account.","An account name does not identify the hands on a keyboard.")]},
 {name:"Read the delivery permit",ids:["permit","ferry","night"],mode:"ferry",beats:[
 "A delivery permit lists a sender, a recipient and a time window.",
 "The Ferry desk sends a large bundle to Chart House inside that window.",
 "Compare the smaller North Pier delivery with the same three conditions."],tasks:[
 pick("Which destination does ticket H4 cover?",["Any harbour desk","North Pier","Chart House"],2,"H4 names one recipient.","Open slip 14."),
 num("How many minutes after the window opened did the Ferry desk send?",4,"minutes","The window opens at 18:20. The delivery starts at 18:24.","Subtract 18:20 from the time on slip 15."),
 pick("Which observed delivery fits all three conditions?",["Desk 7 to North Pier","Ferry desk to Chart House","Both deliveries"],1,"Slip 15 matches sender, recipient and time.","Check the three permit fields one by one.")]},
 {name:"Put the rule to work",ids:["permit","ferry","night"],mode:"test",beats:[
 "Try a permit check that considers only time. Both observed deliveries pass.",
 "Now require the correct sender and receiver too. The North Pier route drops out.",
 "Test an imaginary delivery to see why each condition matters."],tasks:[
 pick("With only the time window checked, which delivery slips pass?",["15 only","16 only","Both 15 and 16"],2,"Both 18:24 and 18:25 are within the ten-minute window.","Ignore the sender and recipient for this trial."),
 pair("Which two permit fields fail for the North Pier delivery?",["Sender","Time window","Recipient","Day of the week"],[0,2],"The sender is 10.8.0.7 and the destination is North Pier.","Compare slip 16 with slip 14."),
 pick("A test ferry sends to Chart House at 18:32. Which condition fails?",["Sender","Time window","Recipient"],1,"18:32 is two minutes beyond the ticket’s end.","Check the right-hand end of the permit window.")]},
 {name:"Which way did it go?",ids:["night","read","blind"],mode:"tide",beats:[
 "Desk 7 sends data out towards North Pier. The traffic desk counts 8 MB.",
 "A smaller reply travels back. The traffic desk counts 1 MB returning.",
 "The counter measures size and direction. It never names the contents of the delivery."],tasks:[
 num("How many MB travelled from Desk 7 to North Pier?",8,"MB","sent_MB=8 describes the outward journey.","Read the sent figure."),
 pick("What does the 1 MB figure describe?",["The size of tide-map.pdf","A second approved delivery","Data received back by the desk"],2,"received_MB measures data travelling back.","Follow the return journey in the scene."),
 pair("Which two details about the transfer still need evidence?",["The destination name","The program that sent it","The content it carried","The number of MB sent"],[1,2],"The monitor stopped reporting programs. The traffic record only counts bytes.","Read slips 16 and 17 side by side.")]},
 {name:"Check the AI’s story",ids:["copy","night","read","blind"],mode:"edit",beats:[
 "An AI draft says someone stole a file and downloaded 8 MB.",
 "Check its verbs against the original slips. The traffic went out from the desk.",
 "Keep file access and network transfer as separate observations while content is unknown."],tasks:[
 pick("Replace the draft’s “downloaded 8 MB” with a supported sentence.",["Desk 7 sent 8 MB to North Pier.","Desk 7 downloaded the tide map.","North Pier deleted a map."],0,"Slip 16 gives the outward direction and size.","Use the traffic source, not the draft."),
 pair("Which two original slips directly support a file read and a transfer?",["19 · AI draft","13 · Map store","16 · Traffic desk","17 · Device monitor"],[1,2],"The map store and traffic desk observed different actions.","Pick the sources that saw each action happen."),
 pick("How should you describe possible map exposure?",["Confirmed theft by Nia.","A possibility worth checking because the same client read a file and sent data.","Impossible because the transfer was allowed."],1,"The two observations justify review without settling what the bytes contained.","Ask whether either original names the uploaded object.")]},
 {name:"Ask the right person",ids:["owner","permit","blind","night"],mode:"route",beats:[
 "The ticket owner checks the actual approval register.",
 "The device monitor explains a gap in its program records.",
 "Send a focused question about the unresolved transfer to the person who can help."],tasks:[
 pick("Which question can the ticket owner answer from the register?",["Who typed the password?","What was inside the 8 MB?","Does H4 cover North Pier?"],2,"The owner can verify the scope of that approval.","Look at the source of slip 18."),
 pick("Which source could help identify the item received at North Pier?",["A destination service record naming received items","The printer’s paper count","The gate clock offset"],0,"A receiving service may keep an item name or identifier. Request its authorised records.","Which system received the data?"),
 pair("Select two proportionate next steps.",["Shut every harbour service","Preserve the original records","Ask for the receiving service’s records around 18:25","Delete the AI draft and close the case"],[1,2],"These steps keep the evidence checkable and investigate the gap with a narrow request.","Think about evidence preservation and a specific time window.")]},
 {name:"Sign the morning report",ids:["nia","read","night","blind","owner"],mode:"dawn",beats:[
 "Morning arrives. The next analyst needs a short account they can verify.",
 "Link the correct desk, file operation and outbound delivery. Label the remaining gap.",
 "Hand over the evidence and a scoped request. Let the approved ferry delivery continue."],tasks:[
 order("Build the evidence trail from the connected desk to the outbound delivery.",["16 · 8 MB leaves","10 · Nia’s session begins","13 · Map read succeeds"],[1,2,0],"The session at 18:18 precedes the 18:21 read and the 18:25 transfer.","Trace the same inside address forward in time."),
 pair("What belongs under “still unknown”?",["The contents of the 8 MB","Whether the file read succeeded","The sending program","The destination named by the traffic desk"],[0,2],"The sources leave both content and program unresolved.","Distinguish an observed field from a missing one."),
 pick("Who should own the next step?",["The printer team should replace the paper.","The incident lead should request scoped follow-up for Desk 7 and North Pier.","Every operator should stop work."],1,"The lead can coordinate a focused check of the possible exposure.","Match the unresolved security question to the person authorised to investigate.")] }
];

const fieldChecks=[
 {title:"The missing labels",intro:"A second printer has stopped. Inspect these new slips, then show the help desk exactly where to look.",rows:[
 ["L1","09:10 · Visitor desk","A visitor reports missing bag labels. The cause is unknown."],
 ["L2","09:11 · Label printer","Job B8 waited 4 minutes. Reason: empty label roll. Result: printed."],
 ["L3","09:13 · Label printer","Job B9 printed. Waiting time: 0 minutes."],
 ["L4","09:13 · Door reader","West door closed."]],fields:[
 ["Which slip gives the cause of the wait?","L2"],["How many minutes did B8 wait?","4"],["Which slip shows the next job printed normally?","L3"]],
 hint:"Find the job with the empty roll, then the job immediately after it."},
 {title:"The footbridge clock",intro:"A bridge uses local time. Build a second timeline using the harbour clock. All times below are on the same day.",rows:[
 ["B1","Clock keeper","The footbridge clock runs two hours ahead of UTC."],
 ["B2","Footbridge gate","Event: 12:04 local. Received by log desk: 10:11 UTC."],
 ["B3","Map store","Visitor guide opened at 10:06 UTC."],
 ["B4","Network desk","Bridge link restored at 10:10 UTC."]],fields:[
 ["Gate event in UTC (HH:MM)","10:04"],["Minutes from gate event to receipt","7"],["Which slip explains how delayed delivery became possible?","B4"]],
 hint:"Subtract two hours from 12:04, then compare that with 10:11. Look for the bridge link returning."},
 {title:"Who held the address?",intro:"Two sessions were given the same inside address at different times. Match the file read to the session that held it when the read happened.",rows:[
 ["S1","Remote access","09:00 to 09:10 · Ivo · Desk 4 · inside address 10.8.0.5"],
 ["S2","Remote access","09:12 to 09:35 · May · Desk 8 · inside address 10.8.0.5"],
 ["S3","Remote access","09:00 to 09:35 · Tess · Desk 9 · inside address 10.8.0.9"],
 ["S4","Map store","09:21 UTC · client 10.8.0.5 · read berth-list.pdf"]],fields:[
 ["Which session slip fits both time and address?","S2"],["What account held that session?","May"],["Which slip records the actual read?","S4"]],
 hint:"First cross out sessions that ended before 09:21. Then compare the client address."},
 {title:"A second permit",intro:"A new ticket allows one sender, one destination and one window. Every condition must match. Use the slips to test all three journeys.",rows:[
 ["P1","Permit book","11:00 to 11:10 UTC · Workshop to Yard Office"],
 ["P2","Traffic desk","11:04 UTC · Workshop to Yard Office · 50 MB sent"],
 ["P3","Traffic desk","11:06 UTC · Workshop to Shop Office · 3 MB sent"],
 ["P4","Traffic desk","11:14 UTC · Workshop to Yard Office · 2 MB sent"]],fields:[
 ["Which delivery fits the entire permit?","P2"],["Which delivery has the wrong destination?","P3"],["How many minutes past the end was the late delivery?","4"]],
 hint:"Copy the destination carefully. For the late trip, compare its time with 11:10."},
 {title:"The draft that guessed",intro:"An assistant wrote “The repair schedule was sent.” Verify the sentence against these new records before writing the main case handover.",rows:[
 ["R1","File desk","14:03 UTC · repair-desk read schedule.pdf successfully."],
 ["R2","Traffic desk","14:05 UTC · repair-desk sent 6 MB to a store and received 2 MB. Contents were not recorded."],
 ["R3","Store owner","The receiving service can check its item history for the authorised investigator."],
 ["R4","Assistant","Draft conclusion: schedule.pdf was definitely sent."]],fields:[
 ["Which slip verifies that the PDF was read?","R1"],["How many MB went out from the desk?","6"],["Which reply identifies the next source to request?","R3"]],
 hint:"Separate the record naming the file from the record counting bytes. Then find the owner who can check received items."}
];
