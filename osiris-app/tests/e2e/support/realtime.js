function decodeFrame(payload) {
	try {
		return JSON.parse(typeof payload === 'string' ? payload : payload.toString());
	} catch {
		return null;
	}
}

function frameMetadata(frame) {
	if (Array.isArray(frame)) {
		return { topic: frame[2], event: frame[3], payload: frame[4] };
	}

	return {
		topic: frame?.topic,
		event: frame?.event,
		payload: frame?.payload
	};
}

export function waitForRealtimeSubscription(
	page,
	{ topic, topicPrefix, requirePostgresChanges = true, timeout = 15_000 }
) {
	const sockets = new Set();
	let matchingReply = null;

	return new Promise((resolve, reject) => {
		let settled = false;

		function cleanup() {
			clearTimeout(timer);
			page.off('websocket', onWebSocket);
			for (const socket of sockets) socket.off('framereceived', onFrameReceived);
		}

		function finish(error) {
			if (settled) return;
			settled = true;
			cleanup();
			if (error) reject(error);
			else resolve();
		}

		function onFrameReceived({ payload }) {
			const metadata = frameMetadata(decodeFrame(payload));
			const matchesTopic = topic
				? metadata.topic === topic
				: metadata.topic?.startsWith(topicPrefix);

			if (matchesTopic && metadata.event === 'phx_reply') {
				matchingReply = metadata.payload;
			}
			const postgresChanges = metadata.payload?.response?.postgres_changes;
			const postgresChangesReady =
				!requirePostgresChanges || (Array.isArray(postgresChanges) && postgresChanges.length > 0);

			if (matchesTopic && metadata.event === 'phx_reply' && metadata.payload?.status === 'ok' && postgresChangesReady) {
				finish();
			}
		}

		function onWebSocket(socket) {
			if (!socket.url().includes('/realtime/')) return;
			sockets.add(socket);
			socket.on('framereceived', onFrameReceived);
		}

		const expectedTopic = topic ?? `${topicPrefix}*`;
		const timer = setTimeout(
			() =>
				finish(
					new Error(
						`Canal Realtime nao confirmou postgres_changes: ${expectedTopic}; resposta: ${JSON.stringify(matchingReply)}`
					)
				),
			timeout
		);
		page.on('websocket', onWebSocket);
	});
}
