import React from 'react';
import PropTypes from 'prop-types';

const TestGroupSection = ({ title, isOpen, onToggle, children }) => {
    // Validate that there is at least one child
    if (!children || (Array.isArray(children) && children.length === 0)) {
        throw new Error('TestGroupSection must contain at least one child component');
    }

    return (
        <section className="test-group-section">
            <div
                className="test-group-header"
                onClick={onToggle}
            >
                <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-3">
                        {isOpen ? 'Click to collapse' : 'Click to expand'}
                    </span>
                    <span className={`transition-transform duration-300 transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="p-4 space-y-4 bg-gray-50">
                    {children}
                </div>
            )}
        </section>
    );
};

TestGroupSection.propTypes = {
    title: PropTypes.string.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired
};

export default TestGroupSection; 