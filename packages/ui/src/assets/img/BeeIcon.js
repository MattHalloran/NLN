import React from 'react';
import PropTypes from 'prop-types';

function BeeIcon(props) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" 
			className={props.className} 
			viewBox="0 0 512 512" 
			aria-labelledby="bee-title" 
			width={props.width} 
			height={props.height}
			onClick={() => typeof props.onClick === 'function' && props.onClick()}>
		<title id="bee-title">{props.iconTitle ?? 'Bee'}</title>
        <path d="M509.527 311.471c-7.749-35.534-32.726-64.314-66.814-76.989L329.53 192.398c8.034-13.096 12.675-28.486 12.675-44.943 0-30.863-16.313-57.976-40.76-73.207 1.539-16.575 8.729-31.957 20.647-43.876l4.765-4.765c5.858-5.857 5.858-15.355 0-21.213-5.857-5.857-15.355-5.857-21.213 0l-4.765 4.765c-14.849 14.85-24.53 33.489-28.151 53.735-5.414-1.069-11.005-1.643-16.728-1.643-5.845 0-11.555.591-17.077 1.705-4.645-23.443-17.426-44.542-36.619-59.721-6.496-5.138-15.931-4.037-21.07 2.461s-4.038 15.931 2.46 21.07c15.014 11.874 24.459 28.891 26.673 47.602-24.342 15.253-40.573 42.303-40.573 73.087 0 16.457 4.642 31.848 12.675 44.943L69.288 234.482C35.2 247.157 10.223 275.937 2.474 311.471c-7.749 35.533 2.978 72.101 28.695 97.816 20.213 20.214 47.126 31.165 74.976 31.165 7.582 0 15.237-.812 22.84-2.471 28.998-6.323 53.494-24.124 68.415-48.982 16.067 35.061 35.452 60.516 43.601 70.458V497c0 8.284 6.716 15 15 15s15-6.716 15-15v-37.543c8.149-9.941 27.534-35.396 43.601-70.458 14.92 24.859 39.417 42.659 68.415 48.982 7.606 1.659 15.256 2.471 22.84 2.471 27.847 0 54.765-10.953 74.976-31.165 25.716-25.715 36.443-62.283 28.694-97.816zm-331.672 49.242c-9.098 24.468-29.756 42.396-55.262 47.958s-51.753-2.139-70.212-20.597c-18.459-18.459-26.159-44.707-20.597-70.212 5.562-25.506 23.491-46.164 47.958-55.262l100.336-37.307c-4.616 18.046-7.501 37.405-7.501 57.613 0 23.302 3.835 45.475 9.738 65.807zm78.126 68.976c-9.818-13.492-24.255-35.752-35.644-63.36H291.6c-11.395 27.575-25.819 49.855-35.619 63.36zm45.924-93.36h-91.847c-3.333-12.222-5.765-25.1-6.844-38.422h105.568c-1.085 13.311-3.53 26.19-6.877 38.422zm-98.687-68.422c1.317-16.15 4.641-31.664 9.138-46.157 12.811 7.555 27.725 11.91 43.644 11.91 15.935 0 30.862-4.363 43.682-11.932 4.482 14.487 7.794 30.004 9.104 46.179zM256 203.66c-30.991 0-56.205-25.214-56.205-56.205S225.009 91.25 256 91.25s56.205 25.213 56.205 56.204S286.991 203.66 256 203.66zm203.619 184.415c-18.459 18.46-44.707 26.155-70.212 20.597-25.505-5.562-46.164-23.49-55.262-47.958l-4.462-12c5.903-20.332 9.738-42.505 9.738-65.807 0-20.208-2.885-39.567-7.501-57.613l100.336 37.307c24.468 9.098 42.396 29.756 47.958 55.262 5.564 25.505-2.136 51.753-20.595 70.212z"/>
		</svg>
	)
}

BeeIcon.propTypes = {
	iconTitle: PropTypes.string,
	className: PropTypes.string,
	onClick: PropTypes.func,
	width: PropTypes.string,
	height: PropTypes.string,
}

export { BeeIcon };