import { memo, useEffect, useState } from 'react';
import axios from 'axios';

import Message from '../Message/Message';
import './ChatCard.css';

// компонент чата
const ChatCard = memo(({ chatId }) => {
    const [inputMessage, setInputMessage] = useState(''); // стейст для поля ввода
    const [messages, setMessages] = useState([]); // стейст для хранения сообщений

    // получение парметров доступа из локального хранилища
    const idInstance = JSON.parse(localStorage.getItem('user'))?.idInstance; 
    const apiTokenInstance = JSON.parse(localStorage.getItem('user'))?.apiTokenInstance;


    useEffect(() => { // эффект рекурсивного вызов функции для постоянного мониторинга входящий уведомлений (по завершению запрос повторяется снова)
        setMessages([]);

        const getMessage = async () => { // функция получения сообщений

            axios.get(`https://api.green-api.com/waInstance${idInstance}/receiveNotification/${apiTokenInstance}`).then(({ data }) => {
                if (data) {

                    // удаление сообщения из очереди 
                    axios.delete(`https://api.green-api.com/waInstance${idInstance}/DeleteNotification/${apiTokenInstance}/${data.receiptId}`).then(res => { 
                        // если сообщение "входящее", "текстовое", пришло из текущего чат и результат удаления положительный, 
                        // то добавить сообщение в массив чата
                        if (data.body.typeWebhook === 'incomingMessageReceived' 
                                && data.body.messageData.typeMessage === 'textMessage' 
                                && data.body.senderData.chatId === chatId
                                && res.data.result
                            ) {
                                setMessages(prevMessages => [ // добавление нового сообщения в массив
                                    ...prevMessages,
                                    {
                                        id: data.body.idMessage,
                                        type: 'incoming',
                                        text: data.body.messageData.textMessageData.textMessage,
                                    }
                                ]);
                        }
                    })
                    .then(res => getMessage()) // повторный вызов при завершении удаления
                    .catch(err => getMessage());
                } else {
                    getMessage(); // рекурсивный вызов функции
                }
            }).catch(err => console.log(err));     
        }

        if (chatId.replace('@c.us', '').length > 0) getMessage(); // если чат выбран (те chatId есть), то начать палучать сообщения
    }, [setMessages, chatId]);

    
    function sendMessage() { // ф-ия отправки сообщения
        if (inputMessage.trim().length > 0 && chatId.replace('@c.us', '').length > 0) { // выполнить отправку, если сообщение не пустое 
            const body = {
                chatId,
                message: inputMessage
            }

            axios.post(`https://api.green-api.com/waInstance${idInstance}/SendMessage/${apiTokenInstance}`, body).then(res => {
                setMessages(prevMessages => [ // добавление нового сообщения в массив
                    ...prevMessages,
                    {
                        id: res.data.idMessage,
                        type: 'outgoing',
                        text: inputMessage,
                    }
                ])
                setInputMessage('');
            }).catch(err => console.log("Ошибка отправки"));
        }
    }


    return (
        <div className="chat-card-container">
            <header className="header">
                <h2 className="subtitle">{ chatId.replace('@c.us', '')}</h2>
            </header>
            <div className="chat-card-main">
                <div className="chat-card-main__inner">
                    { messages.length > 0 ?
                        messages.map(message => (
                            <Message key={message.id} 
                                    typeMessage={message.type}
                                    text={message.text}          
                            />
                        )) 
                      :
                        <p className="explanation">
                            { chatId.replace('@c.us', '').length > 0 ? `Начните чат с пользователем "${chatId.replace('@c.us', '')}"` : 'Чтобы начать чат, его нужно выбрать в панеле слева' }
                        </p>
                    }
                </div>
            </div>
            <footer className="chat-card-footer">
                <input type="text" className="input chat-input" placeholder="Введите сообщение..."
                        value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}/>
                <button onClick={sendMessage} type="button" className="btn-send">
                    <span className="material-symbols-outlined">send</span>
                </button>
            </footer>
        </div>
    );
});

export default ChatCard;