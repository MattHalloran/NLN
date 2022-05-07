import { SvgProps } from './types.d';

export const SoilTypeIcon = (props: SvgProps) => (
    <svg xmlns="http://www.w3.org/2000/svg"
        style={props.style}
        viewBox="0 0 512 512"
        className={props.className}
        aria-labelledby="soil-title"
        width={props.width}
        height={props.height}
        onClick={() => typeof props.onClick === 'function' && props.onClick()}>
        <title id="soil-title">{props.iconTitle ?? 'Soil Type'}</title>
        <path d="M492.92285 17.69434a8.00017 8.00017 0 00-6.86328-1.45557L424.93066 31.521l-29.35254-14.67627a8.00257 8.00257 0 00-7.15624 0l-29.03614 14.51806-44.85547-14.95215A8.00643 8.00643 0 00312 16h-32a7.99934 7.99934 0 00-3.57812.84473L232 39.05566l-44.42188-22.21093A7.99934 7.99934 0 00184 16h-32a7.99392 7.99392 0 00-2.80859.50928L88.80566 39.15381 52.11621 17.14014a8.00129 8.00129 0 00-6.64648-.7295l-24 8A7.99967 7.99967 0 0016 32v456a8.00008 8.00008 0 008 8h464a8.00008 8.00008 0 008-8V24a7.99874 7.99874 0 00-3.07715-6.30566zM47.03906 32.75293l36.84473 22.10693a8.00153 8.00153 0 006.9248.63086L153.4502 32h28.66113l46.31055 23.15527a8.00257 8.00257 0 007.15624 0L281.88867 32h28.81348l46.76758 15.58936a8.00329 8.00329 0 006.10839-.43409L392 32.94434l28.42188 14.21093a8.00675 8.00675 0 005.51855.606L480 34.24609V144h-77.57812l-21.98438-14.65625A8.00221 8.00221 0 00376 128h-72a8.00076 8.00076 0 00-5.65723 2.34326L284.68652 144H272a8.00076 8.00076 0 00-5.65723 2.34326L252.68652 160h-17.373l-29.65625-29.65674A8.00076 8.00076 0 00200 128h-16a8.00221 8.00221 0 00-4.4375 1.34375L136 158.38525l-19.5625-13.0415a7.9962 7.9962 0 00-7.4082-.77148l-35.10254 14.04052-20.26953-20.26953A8.00076 8.00076 0 0048 136H32V37.76611zM480 160v152h-38.70215l-70.76758-23.58936A8.00643 8.00643 0 00368 288h-40a7.99723 7.99723 0 00-2.9707.57227L286.459 304h-59.1455l-13.65625-13.65674A8.00076 8.00076 0 00208 288h-24a8.00076 8.00076 0 00-5.65723 2.34326l-20.26953 20.26953-75.10254-30.04052A7.99723 7.99723 0 0080 280H48a8.00076 8.00076 0 00-5.65723 2.34326L32 292.686V152h12.68652l21.65625 21.65674a7.99656 7.99656 0 008.62793 1.771l36.09278-14.437 20.499 13.66553a7.99771 7.99771 0 008.875 0L186.42188 144h10.26464l29.65625 29.65674A8.00076 8.00076 0 00232 176h24a8.00076 8.00076 0 005.65723-2.34326L275.31348 160H288a8.00076 8.00076 0 005.65723-2.34326L307.31348 144h66.26464l21.98438 14.65625A8.00221 8.00221 0 00400 160zM32 480V315.3139L51.31348 296H78.459l78.57032 31.42773a7.99656 7.99656 0 008.62793-1.771L187.31348 304h17.373l13.65625 13.65674A8.00076 8.00076 0 00224 320h64a7.99723 7.99723 0 002.9707-.57227L329.541 304h37.16113l70.76758 23.58936A8.00643 8.00643 0 00440 328h40v152z" /><path d="M144 384h-20.68652l-13.65625-13.65674A8.00076 8.00076 0 00104 368H88a8.00076 8.00076 0 00-5.65723 2.34326l-24 24a7.99983 7.99983 0 00-1.498 9.23438l24 48A7.99869 7.99869 0 0088 456h16a8.0027 8.0027 0 004.99805-1.75293l40-32A8.00055 8.00055 0 00152 416v-24a8.00008 8.00008 0 00-8-8zm-8 28.15479L101.19336 440h-8.249l-19.21-38.42041L91.31348 384h9.373l13.65625 13.65674A8.00076 8.00076 0 00120 400h16zM180.05859 390.96143a7.99931 7.99931 0 008.05762-.10157l40-24a7.99971 7.99971 0 001.541-12.5166l-24-24a8.00122 8.00122 0 00-11.31446 0l-16 16A8.00035 8.00035 0 00176 352v32a8.00012 8.00012 0 004.05859 6.96143zM192 355.31348l8-8 11.09766 11.09814L192 369.87061zM287.15527 396.42236a8.01 8.01 0 00-8.14746-4.36084l-64 8a8.00127 8.00127 0 00-6.59765 10.46827l16 48a8.00022 8.00022 0 0010.39843 4.96093l64-24a7.99981 7.99981 0 004.34668-11.06836zm-50.1914 49.17188L226.67578 414.728l48.7002-6.08789 9.49414 18.98925zM332.4375 398.65625l24-16A7.99943 7.99943 0 00360 376v-8a7.99922 7.99922 0 00-5.0293-7.42773l-40-16a7.99873 7.99873 0 00-10.126 3.85009l-8 16a7.99983 7.99983 0 001.498 9.23438l24 24a7.9999 7.9999 0 0010.09473.99951zm-18.70312-32.23584l2.1289-4.25879 26.54492 10.61817-13.38867 8.92578zM460.20605 385.19482a8.002 8.002 0 00-7.78417-.35009l-48 24a8.00015 8.00015 0 00-2.82227 11.95507l24 32a7.99778 7.99778 0 008.93066 2.78956l24-8A7.99967 7.99967 0 00464 440v-48a8.0001 8.0001 0 00-3.79395-6.80518zM448 434.23389l-13.05957 4.353-14.78906-19.71826L448 404.94434zM72 328h16v16H72zM136 448h16v16h-16zM176 432h16v16h-16zM248 352h16v16h-16zM352 416h16v16h-16zM392 336h16v16h-16zM424 352h16v16h-16zM328 440h16v16h-16zM64 240h24v16H64zM96 192h24v16H96zM48 104h24v16H48zM280 200h24v16h-24zM304 232h24v16h-24zM384 192h24v16h-24zM400 240h24v16h-24zM128 240h16v16h-16zM216 248h16v16h-16zM344 88h16v16h-16zM424 64h16v16h-16zM432 112h16v16h-16zM208 72h16v16h-16zM224 112h16v16h-16zM440 256h16v16h-16zM168 200h24v16h-24zM304 64h24v16h-24zM104.804 70.797h16v16h-16z" />
    </svg>
)