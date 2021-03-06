import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { loggedInView } from '../App';
import { Icon, Button } from 'react-native-elements';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { GiftedChat } from 'react-native-gifted-chat';
import AnimatedEllipsis from 'react-native-animated-ellipsis';
import { connect } from 'react-redux';
import Fonts from '../utils/Fonts';
import api from '../api';
import io from 'socket.io-client';

class Room extends Component {
  bindSocket(socket) {
    socket.emit('join room', this.props.user); // let socket know we want to join

    socket.on('joined', ({res, message}) => {
      if (!res) {
        alert(message)
      }

      this.setState({ joined: res });
    });
    socket.on('isReady', () => {
      this.setState({
        isReady: true
      })
    })
    socket.on('isActive', isActive => {
      this.setState({ isActive });
    });
    socket.on('user disconnected', name => {
      this.setState({
        display: name + ' was disconnected... Waiting for users...',
        typing: { status: false }
      })
    });
    socket.on('display', (message) => {
      this.setState({display: message})
    });
    socket.on('typing', ({name, status}) => {
      this.setState({ typing: {name, status} })
    });
    socket.on('message', (message) => {
      this.setState(previousState => ({
        messages: GiftedChat.append(previousState.messages, [message]),
      }))
    });
    socket.on('question index', currentQuestionIndex => {
      this.setState({
        currentQuestionIndex
      });
    });
    socket.on('disconnect', () => {
      this.setState({
        isActive: false,
        display: 'Disconnected from room',
        joined: false,
        typing: { status: null }
      });
    });
  }
  renderFooter() {
    // true because we are testing
    if (this.state.typing.status) {
      return (
        <View
          style={{
            padding: 5
          }}
        >
          <AnimatedEllipsis
            style={{
              color: 'white',
              fontSize: 36,
              letterSpacing: -1
            }}
          />
        </View>
      );
    }
    return null;
  }
  componentDidMount() {
    const { roomID } = this.props
    let socket = io(api.getBaseURL() + '/rooms?id=' + roomID)

    this.setState({ socket }, () => {
      this.bindSocket(socket);
    });
  }
  sendMessage(messages = []) {
    let { socket } = this.state;

    socket.emit('message', messages[0].text);
    socket.emit('typing', false)
  }
  onInputTextChanged(text) {
    let { socket } = this.state;
    let oldMessage = this.state.message;

    this.setState({message: text});

    if (oldMessage === '' && text.length > 0) { // if the old message is empty and we started typing
      socket.emit('typing', true)
    } else if (oldMessage.length > 0 && text === '') { // else if old message is not empty and we just made it empty
      socket.emit('typing', false)
    }
  }
  doneAnswering() {
    this.setState({ isActive: null }); // loading
    this.state.socket.emit('done'); // let the server know we are done answering
  }
  onReady() {
    if (!this.state.socket) return
    
    this.state.socket.emit('ready');
  }
  promptLeave() {
    if (!this.state.socket) return

    Alert.alert(
      'Leave room?',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
        { text: 'Leave', onPress: () => {
          this.state.socket.disconnect()
          loggedInView()
        } },
      ]
    )
  }
  constructor(props){
    super(props);
    this.state = {
      message: '',
      messages: [],
      joined: null,
      display: '',
      typing: {
        status: false
      },
      currentQuestionIndex: -1,
      isActive: false,
      isReady: false
    };

    this.sendMessage = this.sendMessage.bind(this);
    this.renderFooter = this.renderFooter.bind(this);
    this.onInputTextChanged = this.onInputTextChanged.bind(this);
    this.doneAnswering = this.doneAnswering.bind(this);
    this.onReady = this.onReady.bind(this);
    this.promptLeave = this.promptLeave.bind(this);
  };
  render(){
    let {
      joined,
      messages,
      display,
      isActive,
      isReady
    } = this.state
    return(
      <View style={styles.mainContainer}>
        <View style={styles.mainHeader}>
          <View> 
            <View
              style={{
                backgroundColor: '#f9c296',
                justifyContent: 'space-between',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <View style={{flex: 1, justifyContent: 'center'}}>
                <Icon
                  name='close'
                  type='evilicons'
                  color='white'
                  size={36}
                  onPress={this.promptLeave}
                />
              </View>
              <View style={{flex: 2, alignItems: 'center'}}>
                <Text
                  style={{
                    ...styles.mainText,
                    fontSize: 32
                  }}
                >
                  36Questions
                </Text>
              </View>
              

              <View style={{flex: 1,}}>
              { !isReady ? 
                <TouchableOpacity
                  style={{
                    ...styles.mainButton
                  }}
                  onPress={this.onReady}
                >
                  <Text
                    style={{
                      ...styles.mainText,
                      fontSize: 18
                    }}
                  >
                    Ready!
                  </Text>
                </TouchableOpacity> : null }

              { isActive !== false ?
                <Button
                  title="DONE!"
                  loading={isActive === null}
                  disabled={!isActive}
                  onPress={this.doneAnswering}
                  loadingProps={{ size: "large", color: "rgba(111, 202, 186, 1)" }}
                  titleStyle={styles.mainText}
                  buttonStyle={{
                    backgroundColor: "transparent",
                    borderColor: "transparent",
                    borderWidth: 0,
                    borderColor: 'white',
                    borderWidth: 1,
                    padding: 8,
                  }}
                /> : null }
              </View>
            </View>
          </View>
          <Text
              style={{
                ...styles.mainText,
                textAlign: 'center',
                backgroundColor: '#f9c296',
                fontSize: 18
              }}
            >
              {display}
          </Text>
          <LinearGradient
            colors={['#f9c296', 'rgba(249, 194, 150, 0)']}
            style={styles.linearGradient}
          />
        </View>
        <GiftedChat
          text={this.state.message}
          onInputTextChanged={text => this.onInputTextChanged(text)}
          renderFooter={this.renderFooter}
          messages={messages}
          onSend={messages => this.sendMessage(messages)}
          user={{
            _id: this.props.user._id
          }}
        />
      </View>
    );
  }
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingTop: 10
  },
  mainHeader: {
    position: 'absolute',
    paddingTop: 15,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1
  },
  mainText: {
    color: 'white',
    fontFamily: Fonts.Playfair
  },
  linearGradient: {
    height: 36,
    width: '100%',
    paddingTop: 8
  },
  mainButton: {
    borderColor: 'white',
    borderWidth: 1,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10
  }
})

const mapStateToProps = state => ({
  user: state.user
})

export default connect(
  mapStateToProps
)(Room)