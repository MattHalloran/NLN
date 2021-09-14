import React from 'react';
import PropTypes from 'prop-types';

function SunIcon(props) {
	return (
    <svg viewBox="0 0 302.4 302.4"
      xmlns="http://www.w3.org/2000/svg" 
      className={props.className}
      aria-labelledby="sun-title"
      width={props.width}
      height={props.height}
      onClick={() => typeof props.onClick === 'function' && props.onClick()}>
      <title id="sun-title">{props.iconTitle ?? 'Sun'}</title>
      <path d="M204.8 97.6C191.2 84 172 75.2 151.2 75.2s-40 8.4-53.6 22.4c-13.6 13.6-22.4 32.8-22.4 53.6s8.8 40 22.4 53.6c13.6 13.6 32.8 22.4 53.6 22.4s40-8.4 53.6-22.4c13.6-13.6 22.4-32.8 22.4-53.6s-8.4-40-22.4-53.6zM151.2 51.6c5.6 0 10.4-4.8 10.4-10.4V10.4c0-5.6-4.8-10.4-10.4-10.4-5.6 0-10.4 4.8-10.4 10.4v30.8c0 5.6 4.8 10.4 10.4 10.4zM236.4 80.8l22-22c4-4 4-10.4 0-14.4s-10.4-4-14.4 0l-22 22c-4 4-4 10.4 0 14.4 3.6 4 10 4 14.4 0zM292 140.8h-30.8c-5.6 0-10.4 4.8-10.4 10.4 0 5.6 4.8 10.4 10.4 10.4H292c5.6 0 10.4-4.8 10.4-10.4 0-5.6-4.8-10.4-10.4-10.4zM236 221.6c-4-4-10.4-4-14.4 0s-4 10.4 0 14.4l22 22c4 4 10.4 4 14.4 0s4-10.4 0-14.4l-22-22zM151.2 250.8c-5.6 0-10.4 4.8-10.4 10.4V292c0 5.6 4.8 10.4 10.4 10.4 5.6 0 10.4-4.8 10.4-10.4v-30.8c0-5.6-4.8-10.4-10.4-10.4zM66 221.6l-22 22c-4 4-4 10.4 0 14.4s10.4 4 14.4 0l22-22c4-4 4-10.4 0-14.4-3.6-4-10-4-14.4 0zM51.6 151.2c0-5.6-4.8-10.4-10.4-10.4H10.4c-5.6 0-10.4 4.8-10.4 10.4s4.8 10.4 10.4 10.4h30.8c5.6 0 10.4-4.8 10.4-10.4zM66 80.8c4 4 10.4 4 14.4 0s4-10.4 0-14.4l-22-22c-4-4-10.4-4-14.4 0s-4 10.4 0 14.4l22 22z"/>
    </svg>
	)
}

SunIcon.propTypes = {
  iconTitle: PropTypes.string,
  className: PropTypes.string,
  onClick: PropTypes.func,
	width: PropTypes.string,
	height: PropTypes.string,
}

export { SunIcon };