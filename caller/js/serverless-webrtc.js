
var localConnection = null;
var dataChannel = null;

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
    var cfg = { "iceServers": [{ "url": "stun:23.21.150.121" }] };
    var con = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

    localConnection = new RTCPeerConnection(cfg, con);
}

function setupSignaling() {
    localConnection.onicecandidate = onIceCandidate;
    
    localConnection.onconnection = onConnection;

    localConnection.onsignalingstatechange = onSignalingStateChange;
    
    localConnection.oniceconnectionstatechange = onIceConnectionStateChange;
    localConnection.onicegatheringstatechange = onIceGatheringStateChange;
}

function onIceCandidate(e) {
    console.log("ICE candidate (pc1)", e);

    if (e.candidate == null) {
        // we can take the offer only NOW
        var desc = localConnection.localDescription;
        showDescription(desc);
    }
};

function setupChannel() {
    try {
        dataChannel = localConnection.createDataChannel('test', { reliable: true });

        console.log("Created datachannel (pc1)");

        dataChannel.onopen = function (e) {
            showDataChannelOpenMessage();
        }

        dataChannel.onmessage = function (e) {
            showMessageReceived(e);
        };

    } catch (e) { console.warn("No data channel (pc1)", e); }

}

function createLocalOffer() {
    
    localConnection.createOffer(function (desc) {
        localConnection.setLocalDescription(desc, function () { });
        // WAIT FOR ON ICE CANDIDATE TO TAKE THIS DESC AS VALID
        console.log("created local offer", desc);
    }, function () { console.warn("Couldn't create offer"); });
}

function onConnection() {
    removeWaitForConnectionModal();
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

    localConnection.setRemoteDescription(answerDesc);
}

function sendMessage(text) {
    var message = { message: text };
    dataChannel.send(JSON.stringify(message));
}




/*
VIEW
*/

function removeWaitForConnectionModal() {
    console.log("Datachannel connected");
    writeToChatLog("Datachannel connected", "text-success");
    $('#waitForConnection').modal('hide');
    // If we didn't call remove() here, there would be a race on pc2:
    //   - first onconnection() hides the dialog, then someone clicks
    //     on answerSentBtn which shows it, and it stays shown forever.
    $('#waitForConnection').remove();
    $('#messageTextBox').focus();
}

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

