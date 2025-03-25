// src/components/ApiConnectionTest.js
import React, { useState, useEffect } from 'react';
import { surveyAPI } from '../services/api';

const ApiConnectionTest = () => {
  const [status, setStatus] = useState('Testing API connection...');
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test direct health endpoint
        try {
          const directHealth = await fetch(`${process.env.REACT_APP_API_URL}/health`);
          if (directHealth.ok) {
            setStatus('✅ Direct health endpoint working');
          } else {
            setStatus('❌ Direct health endpoint failed');
            throw new Error(`Status: ${directHealth.status}`);
          }
        } catch (directError) {
          setStatus('❌ Direct health endpoint failed');
          setError(prev => ({...prev, directHealth: directError.toString()}));
        }
        
        // Test API health endpoint
        try {
          const apiHealth = await surveyAPI.checkHealth();
          setStatus(prev => `${prev}\n✅ API health endpoint working`);
        } catch (apiError) {
          setStatus(prev => `${prev}\n❌ API health endpoint failed`);
          setError(prev => ({...prev, apiHealth: apiError.toString()}));
        }
        
        // Try to get questions
        try {
          const questions = await surveyAPI.getQuestions();
          setStatus(prev => `${prev}\n✅ Questions API working (found ${questions.length} questions)`);
        } catch (questionsError) {
          setStatus(prev => `${prev}\n❌ Questions API failed`);
          setError(prev => ({...prev, questions: questionsError.toString()}));
        }
      } catch (e) {
        setStatus('❌ API connection test failed');
        setError({general: e.toString()});
      }
    };
    
    testConnection();
  }, []);
  
  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '20px auto',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>API Connection Test</h2>
      <div style={{
        whiteSpace: 'pre-wrap',
        padding: '15px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '15px'
      }}>
        {status}
      </div>
      
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff8e6',
          border: '1px solid #ffe0b2',
          borderRadius: '4px'
        }}>
          <h3>Error Details</h3>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontSize: '12px',
            overflowX: 'auto'
          }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{marginTop: '20px'}}>
        <h3>API Configuration</h3>
        <p><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
};

export default ApiConnectionTest;