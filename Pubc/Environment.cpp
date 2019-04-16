/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "IrisBase/Pubc/Environment.h"

using namespace IrisBack::Core;

TB_MESSAGES_BEGIN_DEFINE(Environment);

TB_MESSAGES_ENUM_BEGIN_MEMBER_FUNCTIONS(Environment);
TB_MESSAGES_ENUM_END_MEMBER_FUNCTIONS(Environment);

TB_MESSAGES_END_DEFINE(Environment);

Environment::Environment()
{
}

Environment::~Environment()
{
}

void Environment::UnloadAll()
{
    this->MessengerBaseClass::UnloadAll();
}

void Environment::InternalSetupRelayMap()
{
    this->BaseEnvironment::InternalSetupRelayMap();
    
    this->MessageRelay.Emplace("web", this, &Environment::InternalMessageSendToWeb, this, &Environment::InternalMessageSendToWeb);
}

void Environment::InternalCompileStats(BlackRoot::Format::JSON & json)
{
    this->MessengerBaseClass::InternalCompileStats(json);
}

void Environment::InternalMessageSendToWeb(std::string, Toolbox::Messaging::IAsynchMessage *msg)
{
	std::stringstream ss;

	ss << "<!doctype html>" << std::endl
		<< "<html>" << std::endl
		<< " <head>" << std::endl
		<< "  <title>The Internet</title>" << std::endl
		<< " </head>" << std::endl
		<< " <body>" << std::endl
		<< "  <h1>Welcome</h1>" << std::endl
		<< "  <p>To the internet.</p>" << std::endl
		<< " </body>" << std::endl
		<< "</html>";

    msg->Response = { { "http", ss.str() } };
    msg->SetOK();
    msg->Close();
}