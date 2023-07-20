const ytHostnames: string[] = ['youtu.be', 'www.youtube.com', 'youtube.com'];
const spotifyHostnames: string[] = ['open.spotify.com', 'play.spotify.com'];
const hostnames: string[] = ([] as string[]).concat.apply([], [ytHostnames, spotifyHostnames]);

const validatorOpts = {
	require_host: true,
	host_whitelist: hostnames,
};

export { ytHostnames, spotifyHostnames, validatorOpts };