"use strict";

// The source text is the fictional evidence. Received times come from the collector.
const records = [
  { id:"JOB", source:"Change desk", received:"00:00:03", title:"Approved overnight print delivery", raw:"ticket=PR-88 | approved=2026-11-18T00:00:00Z\nwindow_utc=00:05:00..00:15:00\nsource=10.4.8.12 (SPOOL-02)\ndestination=press.example\npurpose=overnight print delivery | owner=Press Operations" },
  { id:"HELP", source:"Service desk", received:"00:07:31", title:"Page proofs are arriving late", raw:"00:07:30Z  HD-51  Press operator\nJob NQ-16 started late. Please check the rendering queue.\nOperational owner: Press Operations" },
  { id:"QUEUE", source:"Print server", received:"00:07:25", title:"Render queue recovered", raw:"2026-11-18T00:07:20Z PRINT-01\njob=NQ-16 status=resumed wait_seconds=110\ncause=font-cache rebuild | queue_depth=1" },
  { id:"EDGE", source:"Firewall", received:"00:01:11", title:"An inbound connection was denied", raw:"utc,emitter,source,destination,port,action\n00:01:10,EDGE-01,203.0.113.56,10.4.5.22,3389,DENY" },
  { id:"AUTH", source:"Identity", received:"00:10:02", title:"Three failed remote sign-ins", raw:'{"time":"00:02:10Z","emitter":"ID-01","account":"mina","public_ip":"198.51.100.44","app":"vpn","result":"failed","count":3}' },
  { id:"GUEST", source:"VPN gateway", received:"00:03:04", title:"Another session from the same public IP", raw:"00:03:02Z VPN-02 session=G-17 user=eli\npublic_ip=198.51.100.44 device=GUEST-05\nassigned_ip=10.4.9.15 result=success" },
  { id:"VPN", source:"VPN gateway", received:"00:05:04", title:"Design laptop connected", raw:"05:35:00+05:30 VPN-02 session=M-42 user=mina\npublic_ip=198.51.100.44 device=DESIGN-07\nassigned_ip=10.4.9.27 mfa=passed result=success" },
  { id:"FILE", source:"File server", received:"00:06:34", title:"Edition file read", raw:"2026-11-18T00:06:30Z FILE-01\nuser=mina client=10.4.9.27 operation=read\nobject=edition-proof.pdf result=success" },
  { id:"PRESS", source:"Proxy", received:"00:08:13", title:"Delivery to the print service", raw:"00:08:12Z PROXY-01 client=10.4.8.12 dst=press.example\nbytes_sent=1006632960 bytes_received=4096 action=allowed" },
  { id:"GAP", source:"Endpoint sensor", received:"00:08:41", title:"Process reporting interrupted", raw:"00:08:40Z EDR-01 asset=DESIGN-07\nprocess_collector=offline last_heartbeat=00:08:38Z\nstatus applies to process telemetry only" },
  { id:"RELAY", source:"Proxy", received:"00:09:42", title:"Delivery to an external relay", raw:"00:09:40Z PROXY-01 client=10.4.9.27 dst=relay.example\nbytes_sent=50331648 bytes_received=2048 action=allowed" },
  { id:"ALERT", source:"SIEM", received:"00:10:06", title:"Possible related failures and successful connections", raw:"00:10:06Z SIEM-01 rule=fail-then-success\nwindow=10min group_by=public_ip value=198.51.100.44\ncandidates=AUTH,GUEST,VPN priority=review" },
  { id:"CLOCK", source:"Collector", received:"00:10:10", title:"Identity delivery delay explained", raw:"00:10:08Z COLLECT-01 feed=ID-01\nsource_clock=synchronised buffer=drained\nidentity delivery paused 00:01:55Z to 00:10:00Z" }
];

const stations = [
  {name:"Take the call", tool:"Dispatch desk", time:"8 min", goal:"Set a workable scope and protect the originals.", lesson:"A log records an observation. A SIEM (Security Information and Event Management system) collects logs so analysts can search and prioritise them. A rule groups possible matches into an alert. Start with a question narrow enough to test.", example:"If a printer jams at noon, first check that printer and its queue near noon. A network alert that afternoon answers a different question.", action:"Read the three dispatch slips. Select the system, review window and evidence handling method for the security inquiry. Then seal a copy of the supplied originals.", hint:"The SIEM groups public IPs. Review events on both sides of the alert and keep exact source text and timestamps."},
  {name:"Route the records",tool:"Source sorting desk",time:"10 min",goal:"Identify which system can answer each question.",lesson:"Firewall decisions describe connections. Identity results describe sign-ins. Servers record operations. Endpoint sensors report what they could observe on a device. Each source has a different view.",example:"A door reader records that a badge worked. A printer log can tell you whether a document printed. Even when the times match, the two records answer different questions.",action:"Read each short original below. Choose the question it directly answers, then check your routing.",hint:"Look for DENY, count, wait_seconds, operation and process_collector. A sensor gap limits what you can know."},
  {name:"Repair the clock",tool:"Timeline cutting room",time:"12 min",goal:"Reconstruct four events from a delayed feed and a local clock.",lesson:"Event time belongs to the device. Arrival time belongs to the collector. UTC is a common reference time. To convert a positive UTC offset, subtract that offset from the local time.",example:"A gateway that reports 08:30 at UTC+02:00 saw the event at 06:30 UTC. A buffered log can arrive several minutes after the activity.",action:"Set the gateway offset, inspect the converted time, and play the arrival reel. Click event strips in the order the activity happened. Undo the last strip or clear the reel to retry.",hint:"The identity source clock was accurate. The collector buffered its record. Read CLOCK. Compare the converted VPN time with FILE and RELAY."},
  {name:"Trace the session",tool:"Connection board",time:"10 min",goal:"Check the SIEM’s proposed links and trace the client across systems.",lesson:"People can share a public IP. A VPN assigns an internal address for a session. Comparing account, time and the assigned address can strengthen a link across identity, VPN, server and proxy logs.",example:"Two people at a hotel can appear behind one public IP. The account and VPN address help distinguish their sessions.",action:"For each left-hand record choose the field or record on the right that supports the proposed link. Read the animated comparison, then decide what the combined evidence supports.",hint:"Eli and Mina have different VPN sessions. Follow Mina’s assigned_ip into the client fields. A match identifies an account session, while who operated it is still open."},
  {name:"Test the approval",tool:"Change-ticket simulator",time:"12 min",goal:"Compare two real flows and three what-if flows with the approved job.",lesson:"The biggest transfer can be routine. A change ticket can limit the sender, destination and time. A rule that checks only one condition may also accept unrelated traffic.",example:"If delivery is approved for Van 4 at Gate B before lunch, a different van at Gate B still needs its own approval.",action:"Read JOB. Switch on the conditions required by the ticket and run the model. Try a broad rule first, inspect its mistakes, then refine it. Decide which actual transfer needs review.",hint:"Try time alone. Then compare an on-time transfer from the wrong host, a wrong destination and a late test. Each ticket condition covers a different mismatch."},
  {name:"Redline the AI draft",tool:"Copy editor",time:"10 min",goal:"Correct claims using the original source fields.",lesson:"A supplied AI draft can help organise observations. The analyst verifies each claim against approved original evidence and owns the final wording. Use only permitted data in an approved tool.",example:"If a draft says 'all files copied' and the source says list_directory, record that a directory was listed. The file contents remain unknown.",action:"Read each sentence of the simulated AI draft. Select an evidence-backed edit and its source ID. Read the revised copy beneath each original claim, then check your edits.",hint:"Check the VPN result, direction of bytes and endpoint coverage. Divide bytes_sent by 1,048,576 to obtain MiB."},
  {name:"Request a follow-up",tool:"Correspondence desk",time:"8 min",goal:"Request relevant corroboration while keeping the press running.",lesson:"When evidence runs out, identify the unanswered question and the person or service that can answer it. A scoped request can reduce uncertainty without interrupting an essential service.",example:"To check whether a delivery was authorised, ask its owner for the matching approval and time. To identify the application involved, request scoped device telemetry.",action:"Open two relevant enquiries and read the replies. You may explore other requests. Record what the replies add and which question remains unresolved.",hint:"Find the request about approval for relay.example and the request about process and content visibility on DESIGN-07."},
  {name:"Sign the morning hand-off",tool:"Morning edition",time:"12 min",goal:"Escalate an evidence-backed finding with a practical next step.",lesson:"A hand-off gives the next analyst a time window, named systems, evidence IDs, confirmed facts, a cautious explanation and an unresolved question. Include the owner and the next authorised action.",example:"An access log can confirm a successful read. A later flow can justify investigation. Identifying the content of that flow requires independent evidence.",action:"Build the four sections of your hand-off. Add a short sentence for the incoming analyst in your own words. Proofread the resulting report, then sign it to unlock both downloads.",hint:"Keep the documented spooler job separate from Mina’s session. Include the file read, external flow, missing process data and a scoped escalation to the incident lead."}
];

const forms = {
  dispatch:[
    ["Security scope",["All print customers worldwide","Mina’s VPN session and the linked server and proxy activity","All files on the render server"],1],
    ["Review window (UTC)",["00:00–00:15 on the case date","All of last year","Only the moment the alert arrived"],0],
    ["Handling method",["Rewrite raw values to match the dashboard","Discard entries that arrive late","Keep original text, source and time in a separate snapshot"],2]
  ],
  routes:[
    ["EDGE","Which network connection was denied?"],["AUTH","How many sign-ins failed?"],["QUEUE","Why did this print job wait?"],["FILE","Which file operation succeeded?"],["GAP","Which endpoint evidence is missing?"]
  ],
  links:[
    ["AUTH","Which VPN record also matches the account?",["GUEST · eli","VPN · mina","PRESS · spooler"],1,"Compare account=mina and public_ip=198.51.100.44."],
    ["VPN","Which identifier appears as the file server’s client?",["M-42","198.51.100.44","10.4.9.27"],2,"VPN assigned_ip links to FILE client."],
    ["FILE","Which transfer uses that same client?",["RELAY · 10.4.9.27","PRESS · 10.4.8.12"],0,"FILE and RELAY use the VPN-assigned client address."],
    ["ALERT","How confident is the original IP-only grouping?",["All candidate events identify the same person","It is a lead. The shared IP also includes Eli’s separate session."],1,"GUEST is a concrete counterexample to grouping solely by public IP."]
  ],
  edits:[
    {claim:"Mina failed MFA on the connected VPN session.",choices:["The session opened with MFA passed.","Mina definitely operated the laptop.","Every earlier failure was an MFA failure."],answer:0,source:"VPN"},
    {claim:"The laptop received 48 MiB from relay.example.",choices:["Every byte was part of the proof PDF.","The 48 MiB belongs to the print spooler.","The proxy recorded 48 MiB sent from the client to relay.example."],answer:2,source:"RELAY"},
    {claim:"The endpoint sensor identified the program that sent the file.",choices:["The sensor shut down the laptop.","Process reporting went offline before the transfer. The sending process remains unknown.","The offline sensor proves a malicious process stopped it."],answer:1,source:"GAP"}
  ],
  enquiries:[
    ["Change owner","Check the approved sender, destination and window for PR-88.","The press owner confirms PR-88 covers SPOOL-02 to press.example only. No approval for DESIGN-07 to relay.example was found in this register."],
    ["Endpoint custodian","Check available process and content evidence for DESIGN-07 around 00:09 UTC.","Process collection stopped at 00:08:40. The proxy kept byte counts only. Preserve the device for authorised follow-up. The sending process and payload remain unknown."],
    ["Facilities desk","Request last month’s paper delivery schedule.","Paper inventory does not identify this account session, network transfer or sending process."],
    ["Global change desk","Request an immediate shutdown of every print system.","The lead asks for a scoped recommendation. The supplied evidence supports keeping the approved spooler job available during review."]
  ],
  handoff:[
    ["Confirmed observation",["Every file in the print archive was uploaded.","FILE records a proof read from 10.4.9.27. RELAY records 48 MiB sent by that client.","PRESS and RELAY record the same client."],1],
    ["Interpretation",["The linked file read and unapproved route warrant review for possible exposure.","An allowed proxy action proves the transfer was authorised.","The largest transfer must be the incident."],0],
    ["Unresolved question",["Did the proxy record any bytes?","Did the print server have a queue?","Which process sent the bytes and what content did they carry?"],2],
    ["Disposition and owner",["Close every case because the paper printed.","Escalate to the incident lead with the preserved records and request scoped endpoint and file-audit follow-up.","Disable all branch networks immediately."],1]
  ]
};

const flows = [
  ["PRESS","10.4.8.12","press.example","00:08:12"],
  ["RELAY","10.4.9.27","relay.example","00:09:40"],
  ["Test A","10.4.9.27","press.example","00:08:12"],
  ["Test B","10.4.8.12","relay.example","00:08:12"],
  ["Test C","10.4.8.12","press.example","00:22:00"]
];

// Each practice clipping is a separate exercise, outside the live shift's evidence set.
const clippings = [
  [
    ["Bound a service ticket", "HD-12 | labels delayed at 21:07 UTC\nprint host LABEL-03 | job P-19 | queue owner Dispatch", "Which job ID would you put in the ticket scope?", ["P-19"], "Find the value after job."],
    ["Preserve a source", "Case intake lists original record FW-18. A dashboard copy is tagged VIEW-03. The analyst note is NOTE-06.", "Which ID should a reviewer use to retrieve the original firewall evidence?", ["FW-18"], "The case intake labels the original separately from the derived view."]
  ],
  [
    ["Count events carefully", "ID-07 | 18:31 UTC | account=jo | result=failed | occurrences=6\nCollector rows received: 1", "How many failures does this one summary row represent?", ["6","six"], "Read occurrences. A summary row can cover several observations."],
    ["Trace an application error", "APP-03 | req=Q-79 | upstream=TYPE-DB-02 | result=timeout\nFW-03 | allow TCP/443 to APP-03", "Which upstream host should the operations team check?", ["TYPE-DB-02"], "Read upstream in the application record."]
  ],
  [
    ["Cross a date boundary", "Gateway raw time: 18 Nov 01:10 at UTC+02:00. The collector uses UTC.", "Which November day did the event occur on in UTC? Enter the day number.", ["17"], "Subtract two hours from 01:10. The UTC time is on the previous evening."],
    ["Measure delivery lag", "Source event 02:04:00 UTC · SIEM received 02:11:00 UTC · clocks verified", "How many whole minutes did delivery take?", ["7","seven"], "Subtract source time from arrival time. Both use UTC."]
  ],
  [
    ["Pick the session", "V-11 | user=ari | public=203.0.113.5 | assigned=10.1.4.9\nV-12 | user=sam | public=203.0.113.5 | assigned=10.1.4.8\nFILE | user=sam | client=10.1.4.8", "Which VPN session fits the file-server observation?", ["V-12"], "Match the user and the assigned client address."],
    ["Handle a reused address", "V-81 | 23:00–23:10 UTC | assigned=10.1.4.6\nV-83 | 23:12–23:20 UTC | assigned=10.1.4.6\nProxy | 23:15 UTC | client=10.1.4.6", "Which session held the address during the proxy event?", ["V-83"], "Check the lease windows as well as the address."]
  ],
  [
    ["Check an approved window", "CHG-24 | source=SPOOL-04 | destination=plate.example | window 01:00–01:10 UTC\nFlow | SPOOL-04 to plate.example at 01:14 UTC", "How many minutes after the approved end was this flow?", ["4","four"], "Compare 01:14 with the end of the approved window."],
    ["Compare size and scope", "CHG-24 permits SPOOL-04 to plate.example in the window.\nX4 | SPOOL-04 to plate.example | 820 MiB | inside window\nX5 | DESK-09 to plate.example | 12 MiB | inside window", "Which flow ID requires separate approval?", ["X5"], "Compare the sender, destination and time with the ticket."]
  ],
  [
    ["Correct the transfer unit", "PROXY-08 | bytes_sent=2097152 | bytes_received=4194304\nAI draft: 4 MiB uploaded. One MiB equals 1,048,576 bytes.", "How many MiB did the client send?", ["2","two"], "Use bytes_sent and divide by 1,048,576."],
    ["Correct the verb", "FILE-08 | operation=list_directory | path=proofs | result=success\nAI draft: Every proof was downloaded.", "Type the source operation that should appear in the corrected note.", ["list_directory","list directory"], "Copy the operation value exactly to preserve its meaning."]
  ],
  [
    ["Request the missing field", "The proxy identifies client 10.1.9.9. APP-20 records a destination. EDR-20 records initiating_process for this client and time.", "Which source ID should the custodian consult to identify the process?", ["EDR-20"], "Look for the system that collected the process field."],
    ["Bound the follow-up", "Coverage gap 01:06–01:12 UTC. A flow ended at 01:09 UTC. Service audit and proxy logs span the full window.", "How many minutes of endpoint coverage are missing?", ["6","six"], "Subtract the gap start from the gap end. Other sources may still help."]
  ],
  [
    ["Cite the fact", "READ-12 confirms access to cover.pdf. FLOW-19 confirms 9 MiB to relay.example. Neither records payload contents.", "Which record ID directly supports the 9 MiB figure?", ["FLOW-19"], "A flow record counts network bytes. The read audit names the file."],
    ["Choose the hand-off owner", "Local playbook: Press Ops owns queue delays. Incident Lead owns unexplained transfers with linked file access. Desktop Support owns printer installs.", "Which named role takes the unexplained transfer for further assessment?", ["Incident Lead","the incident lead"], "Use the playbook entry that matches the unresolved security question."]
  ]
];
