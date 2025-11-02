
import React from 'react';

const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.418-5.523A2.25 2.25 0 017.88 5.25h8.24a2.25 2.25 0 011.428 1.428l4.418 5.523a1.012 1.012 0 010 .639l-4.418 5.523A2.25 2.25 0 0116.12 18.75H7.88a2.25 2.25 0 01-1.428-1.428L2.036 12.322z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export default EyeIcon;
