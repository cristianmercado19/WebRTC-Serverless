
var pc1 = null;
var activedc = null;

initialModalState();
attachToCreateAnOffer();
attachOnSentAnOffer();
attachOnAnswerReceived();

initializeCaller();

function initializeCaller() {

    setupCaller();
    setupSignaling();
    setupChannel();
}

function setupCaller() {
    var cfg = { "iceServers": [{ "url": "stun:23.21.150.121" }] }, con = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };
    pc1 = new RTCPeerConnection(cfg, con);
}

function setupSignaling() {
    pc1.onicecandidate = function (e) {
        console.log("ICE candidate (pc1)", e);
    
        if (e.candidate == null) {
            // we can take the offer only NOW
            var desc = pc1.localDescription;
            showDescription(desc);
        }
    };
    
    pc1.onconnection = handleOnConnection;

    pc1.onsignalingstatechange = onSignalingStateChange;
    
    pc1.oniceconnectionstatechange = onIceConnectionStateChange;
    pc1.onicegatheringstatechange = onIceGatheringStateChange;
}

function setupChannel() {
    try {
        activedc = pc1.createDataChannel('test', { reliable: true });

        console.log("Created datachannel (pc1)");

        activedc.onopen = function (e) {
            showDataChannelOpenMessage();
        }

        activedc.onmessage = function (e) {
            showMessageReceived(e);
        };

    } catch (e) { console.warn("No data channel (pc1)", e); }

}

function createLocalOffer() {
    
    pc1.createOffer(function (desc) {
        pc1.setLocalDescription(desc, function () { });
        // WAIT FOR ON ICE CANDIDATE TO TAKE THIS DESC AS VALID
        console.log("created local offer", desc);
    }, function () { console.warn("Couldn't create offer"); });
}

function handleOnConnection() {
    console.log("Datachannel connected");
    writeToChatLog("Datachannel connected", "text-success");
    $('#waitForConnection').modal('hide');
    // If we didn't call remove() here, there would be a race on pc2:
    //   - first onconnection() hides the dialog, then someone clicks
    //     on answerSentBtn which shows it, and it stays shown forever.
    $('#waitForConnection').remove();
    $('#messageTextBox').focus();
}

function onSignalingStateChange(state) {
    console.info('signaling state change:', state);
}

function onIceConnectionStateChange(state) {
    console.info('ice connection state change:', state);
}

function onIceGatheringStateChange(state) {
    console.info('ice gathering state change:', state);
}

function setAnswerFromPC2(answer) {
    var answerDesc = new RTCSessionDescription(JSON.parse(answer));

    pc1.setRemoteDescription(answerDesc);
}

function sendMessage(text) {
    var message = { message: text };
    activedc.send(JSON.stringify(message));
}




/*
VIEW
*/

function showMessageReceived(e) {
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
}

function showDataChannelOpenMessage() {
    console.log('data channel connect');
    $('#waitForConnection').modal('hide');
    $('#waitForConnection').remove();
}

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
        
        console.log("Received remote answer: ", JSON.parse(answer));
        writeToChatLog("Received remote answer", "text-success");

        setAnswerFromPC2(answer);

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

function showDescription(desc) {
    $('#localOffer').html(JSON.stringify(desc));
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

