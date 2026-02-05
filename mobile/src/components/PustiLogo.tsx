import React from 'react';
import {Image, StyleSheet} from 'react-native';

const PustiLogo: React.FC<{width?: number; height?: number}> = ({
  width = 150,
  height = 60,
}) => {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={[styles.logo, {width, height}]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});

export default PustiLogo;
