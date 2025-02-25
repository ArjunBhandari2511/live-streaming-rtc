import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const socket = io('http://localhost:5000');

function StreamPage() {
    const videoRef = useRef(null);
    const [isBroadcaster, setIsBroadcaster] = useState(false);
    const [isViewer, setIsViewer] = useState(false);
    const [device, setDevice] = useState(null);
    const [producerTransport, setProducerTransport] = useState(null);

    useEffect(() => {
        const startStreaming = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const role = params.get('role');

                if (role === 'broadcaster') {
                    setIsBroadcaster(true);
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    videoRef.current.srcObject = stream;

                    socket.emit('getRouterRtpCapabilities', async (rtpCapabilities) => {
                        const mediasoupDevice = new mediasoupClient.Device();
                        await mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });
                        setDevice(mediasoupDevice);

                        socket.emit('createTransport', (transportOptions) => {
                            const transport = mediasoupDevice.createSendTransport(transportOptions);
                            setProducerTransport(transport);

                            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                                socket.emit('connectTransport', { dtlsParameters }, (response) => {
                                    if (response.error) errback(response.error);
                                    else callback();
                                });
                            });

                            transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                                socket.emit('produce', { kind, rtpParameters }, ({ id }) => {
                                    if (id) callback({ id });
                                    else errback(new Error('Producer creation failed'));
                                });
                            });

                            const videoTrack = stream.getVideoTracks()[0];
                            transport.produce({ track: videoTrack });
                        });

                        socket.emit('getRouterRtpCapabilities', async (rtpCapabilities) => {
                            const mediasoupDevice = new mediasoupClient.Device();
                            await mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });
                        
                            setDevice(mediasoupDevice);
                        
                            socket.emit('createTransport', (transportOptions) => {
                                const transport = mediasoupDevice.createSendTransport(transportOptions);
                                setProducerTransport(transport);
                        
                                transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                                    socket.emit('connectTransport', { dtlsParameters }, (response) => {
                                        if (response.error) errback(response.error);
                                        else callback();
                                    });
                                });
                        
                                transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                                    socket.emit('produce', { kind, rtpParameters }, ({ id, error }) => {
                                        if (error) errback(new Error(error));
                                        else callback({ id });
                                    });
                                });
                        
                                const videoTrack = stream.getVideoTracks()[0];
                                transport.produce({ track: videoTrack });
                            });
                        });                        
                    });
                } else {
                    setIsViewer(true);
                    socket.emit('getRouterRtpCapabilities', async (rtpCapabilities) => {
                        const mediasoupDevice = new mediasoupClient.Device();
                        await mediasoupDevice.load({ routerRtpCapabilities: rtpCapabilities });

                        socket.emit('createConsumerTransport', (transportOptions) => {
                            const consumerTransport = mediasoupDevice.createRecvTransport(transportOptions);

                            consumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                                socket.emit('connectConsumerTransport', { dtlsParameters }, (response) => {
                                    if (response.error) errback(response.error);
                                    else callback();
                                });
                            });

                            socket.on("consume", async ({ rtpCapabilities }, callback) => {
                                try {
                                    if (!producer) return callback({ error: "No active producer" });
                            
                                    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
                                        return callback({ error: "Cannot consume this producer" });
                                    }
                            
                                    const consumerTransport = await router.createWebRtcTransport({
                                        listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
                                        enableUdp: true,
                                        enableTcp: true,
                                        preferUdp: true,
                                    });
                            
                                    const consumer = await consumerTransport.consume({
                                        producerId: producer.id,
                                        rtpCapabilities,
                                        paused: false,
                                    });
                            
                                    consumerTransports.push(consumerTransport);
                            
                                    callback({
                                        id: consumer.id,
                                        producerId: producer.producerId,
                                        kind: consumer.kind,
                                        rtpParameters: consumer.rtpParameters,
                                    });
                            
                                    socket.emit("stream", { id: consumer.id, kind: consumer.kind });
                                } catch (error) {
                                    console.error("Error consuming:", error);
                                    callback({ error: "Error consuming stream" });
                                }
                            });
                            
                        });
                    });
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        startStreaming();
    }, []);

    return (
        <div className='flex flex-col items-center'>
            <h2 className='text-xl font-bold my-4'>
                {isBroadcaster ? 'Broadcasting...' : isViewer ? 'Viewing Stream' : 'Waiting...'}
            </h2>
            <video className='w-full max-w-3xl mx-auto mt-10' ref={videoRef} autoPlay playsInline></video>
        </div>
    );
}

export default StreamPage;
