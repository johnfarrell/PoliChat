This application can be used to test news headlines before they go public.
An ‘authorized’ user can submit a headline to be reviewed. Any user can review
headlines, with no knowledge whether or not it is real (randomly chosen). The
‘authorized’ user can then view all the responses and decide whether or not to
use it for their article. (no authorization needed in this version)

The sample code was retrieved from: https://github.com/watson-developer-cloud/food-coach
files that were edited or added are:
app.js (100-219)
conversation.js (37-47)
payload.js (148-168)
index.html
submissions.html
.env
report.css
report.html(used as a basis for a response in app.js)

If you want to view the logic of our conversation bot, upload training/empathetic-headline-workspace.json
to your watson assistant workspace

you can find presentation materials here: https://docs.google.com/presentation/d/1V5MyQyGDUY_d1SB2yc9MS2fm5HYJUDZ2w3Uz6Or5Soc/edit?usp=sharing

To run this server locally, navigate to this folder in command prompt, and do
npm install
npm run
and the server will be run on port 3000.