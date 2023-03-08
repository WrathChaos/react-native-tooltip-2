import React from 'react';
import {Text, View, StyleSheet, Pressable} from 'react-native';
// import Tooltip from 'react-native-tooltip-2';
import Tooltip, {Placement} from './build/dist';

const App: React.FC = () => {
  const [toolTipVisible, setToolTipVisible] = React.useState(false);
  return (
    <View style={styles.container}>
      <Tooltip
        isVisible={toolTipVisible}
        content={<Text>Check this out!</Text>}
        placement={Placement.TOP}
        backgroundStyle={{backgroundColor: 'transparent'}}
        onClose={() => setToolTipVisible(false)}>
        <Pressable
          style={styles.button}
          onPress={() => setToolTipVisible(true)}>
          <Text>Press me</Text>
        </Pressable>
      </Tooltip>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
  },
  button: {
    width: 150,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'pink',
  },
});

export default App;
