// src/pages/okr/OkrCard.jsx
import React from 'react';
import ObjectiveRow from './ObjectiveRow';
import KeyResultRow from './KeyResultRow';

export default function OkrCard({ obj, ...props }) {
    const { openObj, setOpenObj } = props;

    return (
        <tbody className="mb-4 block rounded-lg bg-white shadow-md">
            <ObjectiveRow obj={obj} {...props} />
            {openObj[obj.objective_id] &&
                obj.key_results?.map((kr) => (
                    <KeyResultRow
                        key={kr.kr_id}
                        kr={kr}
                        objective={obj}
                        {...props}
                    />
                ))}
        </tbody>
    );
}
