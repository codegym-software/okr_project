import React, { useState, useEffect } from 'react';
import AsyncSelect from 'react-select/async';
import axios from 'axios';
import debounce from 'lodash/debounce';

export default function UserSearchInput({ onUserSelect, initialUser, objectiveDepartmentId, currentUserRole }) {
    const [selectedOption, setSelectedOption] = useState(null);

    // Set initial selected user if provided
    useEffect(() => {
        if (initialUser && initialUser.user_id) {
            setSelectedOption({
                value: initialUser.user_id,
                label: initialUser.full_name + ' (' + initialUser.email + ')',
                user: initialUser
            });
        } else {
            setSelectedOption(null);
        }
    }, [initialUser]);

    const loadOptions = (inputValue, callback) => {
        const params = {};
        
        // Nếu có department_id và không có query, load tất cả users trong phòng ban
        if (objectiveDepartmentId && !inputValue) {
            params.department_id = objectiveDepartmentId;
            // Load tất cả users trong phòng ban (không cần query)
            axios.get('/api/users/search', { params: { ...params, q: '' } })
                .then(response => {
                    // Nếu không có users, thử với query rỗng nhưng có department_id
                    const users = response.data.data.map(user => ({
                        value: user.user_id,
                        label: user.full_name + ' (' + user.email + ')',
                        user: user
                    }));
                    callback(users);
                })
                .catch(() => {
                    // Nếu API không hỗ trợ, chỉ trả về empty
                    callback([]);
                });
            return;
        }
        
        // Nếu không có inputValue, không load gì
        if (!inputValue) {
            return callback([]);
        }

        params.q = inputValue;
        if (objectiveDepartmentId && currentUserRole && !['admin', 'ceo'].includes(currentUserRole.toLowerCase())) {
            params.department_id = objectiveDepartmentId;
        }

        axios.get('/api/users/search', { params })
            .then(response => {
                const users = response.data.data.map(user => ({
                    value: user.user_id,
                    label: user.full_name + ' (' + user.email + ')',
                    user: user
                }));
                callback(users);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                callback([]);
            });
    };

    const debouncedLoadOptions = debounce(loadOptions, 350);

    const handleChange = (selectedOption) => {
        setSelectedOption(selectedOption);
        onUserSelect(selectedOption ? selectedOption.user : null);
    };

    return (
        <AsyncSelect
            cacheOptions
            loadOptions={debouncedLoadOptions}
            defaultOptions
            onChange={handleChange}
            value={selectedOption}
            isClearable
            placeholder="Tìm kiếm người dùng..."
            noOptionsMessage={() => "Không tìm thấy người dùng"}
            loadingMessage={() => "Đang tìm kiếm..."}
            styles={{
                control: (base) => ({
                    ...base,
                    minHeight: '38px',
                    borderColor: '#CBD5E0',
                    '&:hover': {
                        borderColor: '#94A3B8',
                    },
                    boxShadow: 'none',
                    '&:focus': {
                        borderColor: '#2563EB',
                        boxShadow: '0 0 0 1px #2563EB',
                    },
                }),
                menu: (base) => ({
                    ...base,
                    zIndex: 9999
                }),
                option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#E0F2F7' : null,
                    color: '#1A202C',
                    '&:active': {
                        backgroundColor: '#0EA5E9'
                    }
                }),
            }}
        />
    );
}
