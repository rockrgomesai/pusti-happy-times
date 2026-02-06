/**
 * TKG Pusti HT Sales App
 * @format
 */

import React from 'react';
import {StatusBar, View, Text, StyleSheet} from 'react-native';

function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.title}>TKG Pusti HT Sales App</Text>
      <Text style={styles.subtitle}>Login Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default App;
