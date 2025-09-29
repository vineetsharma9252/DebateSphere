import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  Animated
} from 'react-native';
import Navbar from './Navbar';

const { width } = Dimensions.get('window');

export default function Dashboard() {


  const data = [1, 2, 3, 4, 5 , 6 , 7 ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderSliderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.sliderItem, { width, transform: [{ scale }] }]}>
        <Text style={styles.sliderText}>🔥 Slider Item {item}</Text>
      </Animated.View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex ? styles.paginationDotActive : styles.paginationDotInactive
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Navbar />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sliderContainer}>
          <Animated.FlatList
            data={data}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
            }}
            keyExtractor={(item) => item.toString()}
            renderItem={renderSliderItem}
          />
          {renderPagination()}
        </View>

        <View style={styles.feedContainer}>
          {data.map((item) => (
            <View key={item} style={styles.feedItem}>
              <Text style={styles.feedText}>🗣️ Feed Item {item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderItem: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'tomato',
    borderRadius: 10,
    borderColor: 'black',
    borderWidth: 2,
    marginHorizontal: 10,
  },
  sliderText: {
    fontSize: 22,
    color: '#fff',
    marginLeft: 15,
    fontWeight: 'bold',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4CAF50',
  },
  paginationDotInactive: {
    backgroundColor: '#ccc',
  },
  feedContainer: {
    paddingHorizontal: 10,
  },
  feedItem: {
    height: 100,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  feedText: {
    fontSize: 18,
    fontWeight: '500',
  },
});