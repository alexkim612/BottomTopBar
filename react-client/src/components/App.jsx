import React from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Queue from './Queue.jsx';
import Progress from './Progress.jsx';
import Image from './Image.jsx';
import ArtistTitle from './ArtistTitle.jsx';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      initial: [], // Initial load of songs
      currentIdx: 0, // Current song in array
      song: '', // song url to load as audio source
      seeking: 0, // Seeking time
      volume: 100, // Volume of audio
      pop: false, // Pop up the volume slider
      queuepop: false, // Pop up the queue
      playing: false, // State of the song
      shuffle: false, // Shuffle songs
      loop: false, // replay song
      loopAll: false, // replay song infinitely
      startTime: '0:00', // Current time
      endTime: '0:00', // Duration of song
    };

    this.handleChange = this.handleChange.bind(this);
    this.popUpVolume = this.popUpVolume.bind(this);
    this.popUpQueue = this.popUpQueue.bind(this);
    this.playSong = this.playSong.bind(this);
    this.pauseSong = this.pauseSong.bind(this);
    this.goBack = this.goBack.bind(this);
    this.skip = this.skip.bind(this);
    this.repeat = this.repeat.bind(this);
    this.repeatAll = this.repeatAll.bind(this);
    this.repeatNone = this.repeatNone.bind(this);
    this.check = (cb, wait) => {
      setInterval(cb, wait);
    };
  }

  // Initial call to load player with song and queue with songs.
  // Default behavior of component based on SoundClound does not
  // load queue with songs nor does the player have a song loaded initially.
  // Songs only get added to the queue when user adds them.
  componentDidMount() {
    // If my component needed to add songs
    // Make get request to server
    // load app with songs data that includes
    // link to Amazon S3 where the images and actual song will be served

    // User interacts with songs that are already stored on the app
    // When they play/pause, skip, go back, etc...
    this.getSongs();
  }

  getSongs() {
    axios.get('http://localhost:3000/initial')
      .then((res) => {
        // console.log(res);
        this.setState({
          initial: res.data,
        }, () => {
          const { initial, currentIdx } = this.state;
          this.setState({ song: initial[currentIdx] });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  handleChange(event, param) {
    const { name, value } = event.target;
    const song = param;
    this.setState({
      [name]: value,
    }, () => {
      if (name === 'seeking') {
        song.currentTime = (value / 100) * song.duration;
      }
    });
  }

  popUpVolume() {
    // Change visibility of the volume slider
    this.setState((state) => ({ pop: !state.pop }));
  }

  popUpQueue() {
    // Change visibility of the queue pop up
    this.setState((state) => ({ queuepop: !state.queuepop }));
  }

  // this.setState({ startTime: song.currentTime.toString() });
  playSong(song) {
    // Set state to true, start interval, and play song

    // song.ontimeupdate = () => { console.log(song.currentTime); };
    this.setState({ playing: true }, () => {
      const callback = () => {
        // Constantly update startTime and slider value
        const currentSeeking = (song.currentTime / song.duration) * 100;
        const currentStartTime = Math.floor(song.currentTime);
        // const checkDuration = () => {
        //   // If song has ended check whether user has wanted to loop once or inf.
        //   if (song.ended) {
        //     console.log('Checking song has ended');
        //     const { loop, loopAll } = this.state;
        //     if (loop === true && loopAll === false) {
        //       this.repeat(song);
        //     }
        //   }
        // };

        song.ontimeupdate = () => {
          this.setState({ seeking: currentSeeking }, () => {
            if (song.ended) {
              this.setState({ playing: false });
            }
          });
          this.updateTime(currentStartTime);
        };
      };
      // Set up interval to constantly update startTime and progress bar
      this.check(callback, 500);
      // play song
      song.play();
      this.convertDuration(song.duration);
    });
  }

  goBack() {
    // Go back one from current index
    // console.log('Outside goBack', currentIdx);
    const { currentIdx, initial } = this.state;
    if (currentIdx !== 0) {
      this.setState((state) => ({ currentIdx: state.currentIdx - 1 }), () => {
        this.setState({ song: initial[this.state.currentIdx] });
      });
    }
  }

  skip() {
    // Go forward one from current index
    const { initial, currentIdx } = this.state;
    this.setState({ currentIdx: currentIdx + 1 }, () => {
      this.setState({ song: initial[this.state.currentIdx] });
    });
  }

  repeat(song) {
    this.setState({ loop: true }, () => {
      const { loop } = this.state;
      song.loop = loop;
    });
  }

  repeatAll(song) {
    song.loop = false;
    this.setState({ loopAll: true });
  }

  repeatNone() {
    this.setState({ loop: false, loopAll: false });
  }

  pauseSong(song) {
    // Set state to false, clear interval, and pause song
    this.setState({ playing: false }, () => {
      clearInterval(this.check);
      song.pause();
    });
  }

  // Format time in minutes:seconds -> 1:23
  updateTime(time) {
    const minutes = Math.floor(time / 60).toString();
    let seconds = time % 60;
    seconds = seconds < 10 ? `:0${seconds}` : `:${seconds}`;
    const displayTime = minutes + seconds;
    this.setState({ startTime: displayTime });
  }

  convertDuration(time) {
    const minutes = Math.floor(time / 60).toString();
    let seconds = Math.floor(time % 60);
    seconds = seconds < 10 ? `:0${seconds}` : `:${seconds}`;
    const displayTime = minutes + seconds;
    this.setState({ endTime: displayTime });
  }

  render() {
    const {
      seeking, volume, pop, queuepop, song, playing, startTime, endTime, loop, loopAll,
    } = this.state;

    // The audio source. Will use audio properties for functionality.
    const sng = document.getElementById('songsrc');

    // Pop up volume and queue
    const volVisibility = pop ? 'visible' : 'hidden';
    const queueVisibility = queuepop ? 'visible' : 'hidden';

    // Repeat button
    let repeatButton;
    if (loopAll && loop) {
      repeatButton = <RepeatAll onClick={this.repeatNone} />;
    } else if (loop) {
      repeatButton = <RepeatOne onClick={() => { this.repeatAll(sng); }} />;
    } else {
      repeatButton = <Repeat onClick={() => { this.repeat(sng); }} />;
    }

    return (
      <div className="playback-bar">
        <audio src={song.song_url} type="audio/mpeg" id="songsrc">
          <track kind="captions" />
        </audio>
        {/* <div className="player-container"> */}
        <section className="player">
          <PlayBackbg />
          <div className="playcontrol-buttons">
            <Back onClick={this.goBack} />
            {playing ? <Pause onClick={() => { this.pauseSong(sng); }} />
              : <Play onClick={() => { this.playSong(sng); }} />}
            <Forward onClick={this.skip} />
            <Shuffle />
            {repeatButton}
            <div className="progress">
              <Start>{startTime}</Start>
              <Progress change={this.handleChange} val={seeking} song={sng} />
              <End>{endTime}</End>
            </div>
            <div>
              <div className="volume">
                <Volume onMouseEnter={this.popUpVolume} />
                <div style={{ visibility: volVisibility }} className="volume-slider-container" onMouseLeave={this.popUpVolume}>
                  <input type="range" min="0" max="100" value={volume} id="vol" name="volume" onChange={this.handleChange} />
                </div>
              </div>
            </div>
            <div className="song-info">
              <Image image={song.song_image} />
              <ArtistTitle artist={song.artist} title={song.title} />
              <Heart />
              <Queueb onClick={this.popUpQueue} />
            </div>
            <div style={{ visibility: queueVisibility }} className="queue-container">
              <Queue />
            </div>
          </div>
        </section>
        {/* </div> */}
      </div>
    );
  }
}

// Buttons
const Button = styled.button`
  position: relative;
  visibility: visible;
  background-repeat: no-repeat;
  background-position: 40%;
  background-color: transparent;
  width: 24px;
  height: 100%;
  margin: 0 0 0 12px;
  border: 0;
  cursor: pointer;
`;

const Back = styled(Button)`
  background-image: url("buttons/back.svg");
`;

const Play = styled(Button)`
  background-image: url("buttons/play.svg");
`;

const Pause = styled(Button)`
  background-image: url("buttons/pause.svg");
`;

const Forward = styled(Button)`
  background-image: url("buttons/forward.svg");
`;

const Shuffle = styled(Button)`
  background-image: url("buttons/shuffle_black.svg");
`;

const Repeat = styled(Button)`
  background-image: url("buttons/repeat_none.svg");
  margin-right: 20px;
`;

const RepeatOne = styled(Button)`
  background-image: url("buttons/repeat_one.svg");
  margin-right: 20px;
`;

const RepeatAll = styled(Button)`
  background-image: url("buttons/repeat.svg");
  margin-right: 20px;
`;

const Volume = styled(Button)`
  background-image: url("buttons/volume.svg");
  padding: 10px;
  margin-bottom: 15px;
`;

const Heart = styled(Button)`
  background-image: url("buttons/heart.svg");
`;

const Queueb = styled(Button)`
  background-image: url("buttons/queue.svg");
`;

// Timestamps
const Time = styled.div`
  width: 50px;
  height: 46px;
  line-height: 46px;
`;

const Start = styled(Time)`
  text-align: right;
  color: #f50;
`;

const End = styled(Time)`
  text-align: left;
  color: #333;
`;

// Background for whole container
const PlayBackbg = styled.div`
  border-top: 1px solid #cecece;
  background-color: #f2f2f2;
  position: absolute;
  visibility: visible;
  display: block;
  width: 100%;
  height: 100%;
`;

export default App;
