/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var localConnection;
var sendChannel;
var receiveChannel;
var pcConstraint;
var dataConstraint;
var dataChannelSend = document.querySelector('textarea#dataChannelSend');
var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
var offerTextArea = document.querySelector('textarea#offer');
var answerTextArea = document.querySelector('textarea#answer');

var startButton = document.querySelector('button#startButton');
var sendButton = document.querySelector('button#sendButton');
var closeButton = document.querySelector('button#closeButton');
var setupOfferButton = document.querySelector('button#setupOfferButton');

sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
setupOfferButton.onclick = setupOffer;

function enableStartButton() {}

function disableSendButton() {}

function setupOffer() {
  dataChannelSend.placeholder = '';
  
  var offerValue = offerTextArea.value;
  var offer = JSON.parse(offerValue);

  var cfg = { "iceServers": [{ "url": "stun:23.21.150.121" }] };
  var con = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

  // 1 connections
  window.localConnection = localConnection = new RTCPeerConnection(cfg, con);

  localConnection.ondatachannel = onDataChannel;

  // 2 candidate negotiation
  localConnection.onicecandidate = onIceCandidate;
  localConnection.onconnection = onConnection;
  localConnection.onsignalingstatechange = onSignalingStateChange;
  localConnection.oniceconnectionstatechange = onIceConnectionStateChange;
  localConnection.onicegatheringstatechange = onIceGatheringStateChange;

  // 3 channel creation
  // sendChannel = localConnection.createDataChannel('test', { reliable: true });


  localConnection.setRemoteDescription(offer);

  localConnection.onconnectionstatechange = onConnection;

  // create channel
  localConnection.createAnswer().then(
    setAnswer,
    onCreateSessionDescriptionError
  );
}

function onDataChannel(e) {

  console.log('onDataChannel', e);

  sendChannel = e.channel || e; // Chrome sends event, FF sends raw channel

  sendChannel.onopen = onOpen;
  sendChannel.onclose = onSendChannelStateChange;
  sendChannel.onmessage = onReceiveMessageCallback;
}

function onOpen(e) {
  console.info('ice gathering state change:', e);
}


function onIceGatheringStateChange(state) {
  console.info('ice gathering state change:', state);
}

function onIceConnectionStateChange(state) {
  console.info('ice connection state change:', state);
}

function onSignalingStateChange(state) {
  console.info('signaling state change:', state);
}

function onIceConnectionStateChange(state) {
  console.info('ice connection state change:', state);
}

function onSignalingStateChange(state) {
  console.info('signaling state change:', state);
}

function onConnection(peer, event) {
    console.log('onconnectionstatechange', event);
}

function onIceCandidate(e) {
  console.log('LOCAL onIceCandidate event >')

  console.log("ICE candidate (pc2)", e);

  if (e.candidate === null) {
    console.info("ANSWER READY");

    var answer = localConnection.localDescription;
    var answerJson = JSON.stringify(answer);
    answerTextArea.value = answerJson;
  }
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function sendData() {
  var data = dataChannelSend.value;
  var message = JSON.stringify({message: data});
  sendChannel.send(message);
  trace('Sent Data: ' + data);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  trace('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
  disableSendButton();
  enableStartButton();
}

function setAnswer(answer) {
  localConnection.setLocalDescription(answer);
  console.log('Answer created');
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function receiveChannelCallback(event) {
  // trace('Receive Channel Callback');
  // receiveChannel = event.channel;
  // receiveChannel.onmessage = onReceiveMessageCallback;
  // receiveChannel.onopen = onReceiveChannelStateChange;
  // receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(e) {
  console.info('MESSAGE', e);
  
  var data = JSON.parse(e.data);
  dataChannelReceive.value = data.message;
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
