var cfg = { "iceServers": [{ "url": "stun:23.21.150.121" }] },
    con = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

var pc1 = new RTCPeerConnection(cfg, con),
    dc1 = null, tn1 = null;

var activedc;

var pc1icedone = false;

initialModalState();
attachToCreateAnOffer();
attachOnSentAnOffer();
attachOnAnswerReceived();

function sendMessage(text) {
    var message = { message: text };
    activedc.send(JSON.stringify(message));
}

function setupDC1() {
    try {
        dc1 = pc1.createDataChannel('test', { reliable: true });

        activedc = dc1;

        console.log("Created datachannel (pc1)");

        dc1.onopen = function (e) {
            console.log('data channel connect');
            $('#waitForConnection').modal('hide');
            $('#waitForConnection').remove();
        }

        dc1.onmessage = function (e) {
            console.log("Got message (pc1)", e.data);

            if (e.data.charCodeAt(0) == 2) {
                console.warn('invalid message');
                // The first message we get from Firefox (but not Chrome)
                // is literal ASCII 2 and I don't understand why -- if we
                // leave it in, JSON.parse() will barf.
                return;
            }

            console.log(e);

            var data = JSON.parse(e.data);

            writeToChatLog(data.message, "text-info");
            // Scroll chat text area to the bottom on new input.
            $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
        };

    } catch (e) { console.warn("No data channel (pc1)", e); }
}

function createLocalOffer() {
    setupDC1();

    pc1.createOffer(function (desc) {
        pc1.setLocalDescription(desc, function () { });
        // WAIT FOR ON ICE CANDIDATE TO TAKE THIS DESC AS VALID
        console.log("created local offer", desc);
    }, function () { console.warn("Couldn't create offer"); });
}

pc1.onicecandidate = function (e) {
    console.log("ICE candidate (pc1)", e);

    if (e.candidate == null) {
        // we can take the offer only NOW
        $('#localOffer').html(JSON.stringify(pc1.localDescription));
    }
};

function handleOnconnection() {
    console.log("Datachannel connected");
    writeToChatLog("Datachannel connected", "text-success");
    $('#waitForConnection').modal('hide');
    // If we didn't call remove() here, there would be a race on pc2:
    //   - first onconnection() hides the dialog, then someone clicks
    //     on answerSentBtn which shows it, and it stays shown forever.
    $('#waitForConnection').remove();
    $('#messageTextBox').focus();
}

pc1.onconnection = handleOnconnection;

function onsignalingstatechange(state) {
    console.info('signaling state change:', state);
}

function oniceconnectionstatechange(state) {
    console.info('ice connection state change:', state);
}

function onicegatheringstatechange(state) {
    console.info('ice gathering state change:', state);
}

pc1.onsignalingstatechange = onsignalingstatechange;
pc1.oniceconnectionstatechange = oniceconnectionstatechange;
pc1.onicegatheringstatechange = onicegatheringstatechange;

function handleAnswerFromPC2(answer) {
    var answerDesc = new RTCSessionDescription(JSON.parse(answer));

    console.log("Received remote answer: ", answerDesc);
    writeToChatLog("Received remote answer", "text-success");

    pc1.setRemoteDescription(answerDesc);
}


function getTimestamp() {
    var totalSec = new Date().getTime() / 1000;
    var hours = parseInt(totalSec / 3600) % 24;
    var minutes = parseInt(totalSec / 60) % 60;
    var seconds = parseInt(totalSec % 60);

    var result = (hours < 10 ? "0" + hours : hours) + ":" +
        (minutes < 10 ? "0" + minutes : minutes) + ":" +
        (seconds < 10 ? "0" + seconds : seconds);

    return result;
}

function writeToChatLog(message, message_type) {
    document.getElementById('chatlog').innerHTML += '<p class=\"' + message_type + '\">' + "[" + getTimestamp() + "] " + message + '</p>';
}






/*
VIEW
*/

function initialModalState() {
    $('#showLocalOffer').modal('hide');
    $('#getRemoteAnswer').modal('hide');
    $('#waitForConnection').modal('hide');
    $('#createOrJoin').modal('show');
}

function attachToCreateAnOffer() {
    $('#createBtn').click(function () {
        $('#showLocalOffer').modal('show');
        createLocalOffer();
    });
}

function attachOnSentAnOffer() {
    $('#offerSentBtn').click(function () {
        $('#getRemoteAnswer').modal('show');
    });
}

function attachOnAnswerReceived() {
    $('#answerRecdBtn').click(function () {
        var answer = $('#remoteAnswer').val();
        handleAnswerFromPC2(answer);

        $('#waitForConnection').modal('show');
    });
}

function onSendMessage() {
    if ($('#messageTextBox').val()) {

        writeToChatLog($('#messageTextBox').val(), "text-success");

        var text = $('#messageTextBox').val();
        sendMessage(text);

        $('#messageTextBox').val("");
        $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
    }

    return false;
};