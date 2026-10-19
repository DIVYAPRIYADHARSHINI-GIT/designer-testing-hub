import type { HandleClientError } from '@sveltejs/kit';

// A 404 is a normal page (our +error.svelte), not a crash: don't log it as an error.
export const handleError: HandleClientError = ({ error, status, message }) => {
	if (status !== 404) console.error(error);
	return { message: status === 404 ? 'Not found' : message };
};
